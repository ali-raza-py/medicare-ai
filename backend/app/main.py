from __future__ import annotations

import asyncio
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.app.auth import AuthUser, ensure_jwt_configured, get_auth_user
from backend.app.config import settings
from backend.app.document_pipeline import (
    NO_READABLE_TEXT,
    build_event_description,
    chunk_text,
    classify_document_event,
    extract_metadata,
    extract_text_from_bytes,
    extract_text_structured,
    summarize_ocr_details,
)
from backend.app.providers import build_provider
from backend.app.rag import build_medical_answer, compare_reports
from backend.app.storage import DocumentRecord, build_document_store
from backend.app import supabase_service

try:
    from backend.app.ocr import OCR_AVAILABLE as _ocr_ok
except ImportError:
    _ocr_ok = False

# Extensions the upload endpoint accepts.  Validated before any OCR work so
# the client receives an immediate 415 rather than a silent empty document.
_ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.webp'}

app = FastAPI(title='MediCare AI Backend', version='0.1.0')

# JWT signature verification is mandatory. In production a missing signing
# secret must abort startup rather than run with insecure authentication.
ensure_jwt_configured(settings.environment, settings.jwt_secret)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

logger = logging.getLogger(__name__)

store = build_document_store(settings.upload_dir)
provider = build_provider()


def _is_uuid(value: str | None) -> bool:
    if not value:
        return False
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False


def _normalize_status(value: Any) -> str:
    """Map a stored processing status onto the honest state machine.

    Valid states: uploaded → processing → processed | failed. The legacy
    'completed' value (written before statuses were honest) maps to
    'processed'; anything unknown becomes 'processing' so a document is never
    shown as finished when it is not.
    """
    status = str(value or '').strip().lower()
    if status in {'processed', 'completed'}:
        return 'processed'
    if status == 'failed':
        return 'failed'
    if status == 'uploaded':
        return 'uploaded'
    return 'processing'


def _hydrate_from_supabase(document_id: str, current_user: AuthUser) -> DocumentRecord | None:
    """Load a document row from Supabase when this instance's local store does
    not have it (Vercel serverless instances do not share a filesystem)."""
    if not supabase_service.is_available() or not _is_uuid(current_user.sub):
        return None
    row = supabase_service.get_document_record(document_id)
    if not row or row.get('user_id') != current_user.sub:
        return None
    text = str(row.get('extracted_text') or '')
    filename = str(row.get('file_name') or document_id)
    status = _normalize_status(row.get('processing_status'))
    document = DocumentRecord(
        document_id=str(row['id']),
        title=filename,
        filename=filename,
        content_type='application/octet-stream',
        text=text,
        chunks=chunk_text(text),
        metadata={'filename': filename, 'file_type': row.get('document_type')},
        processed=status == 'processed',
        created_at=str(row.get('created_at') or ''),
        owner=current_user.email,
        status=status,
        error_message=row.get('error_message'),
    )
    store.documents[document_id] = document  # cache for this instance
    return document


def _resolve_document(document_id: str, current_user: AuthUser) -> DocumentRecord | None:
    document = store.get(document_id)
    if document is not None:
        if document.owner != current_user.email:
            raise HTTPException(status_code=403, detail='Access denied.')
        return document
    return _hydrate_from_supabase(document_id, current_user)

# Initialise Supabase integration (no-ops if vars are absent)
supabase_service.configure(
    url=settings.supabase_url,
    service_key=settings.supabase_service_key,
    anon_key=settings.supabase_anon_key,
)
if supabase_service.is_available():
    logger.info('Supabase integration is active')
else:
    logger.info('Supabase integration is not configured — using local store only')


class HealthResponse(BaseModel):
    status: str
    app_name: str
    environment: str


class UploadResponse(BaseModel):
    document_id: str
    title: str
    filename: str
    status: str
    supabase_synced: bool = False
    storage_synced: bool = False
    error_message: str | None = None
    page_count: int | None = None


class DocumentListItem(BaseModel):
    id: str
    title: str
    filename: str
    document_type: str | None = None
    processing_status: str = 'processed'
    created_at: str | None = None
    chunks: int = 0


class DocumentListResponse(BaseModel):
    documents: list[DocumentListItem]
    total: int


class ProcessDocumentRequest(BaseModel):
    document_id: str


class ProcessDocumentResponse(BaseModel):
    document_id: str
    chunks: int
    metadata: dict[str, Any]
    processed: bool
    status: str = 'processed'
    error_message: str | None = None
    ocr_details: dict[str, Any] | None = None


class MedicalAnswerRequest(BaseModel):
    question: str = Field(..., min_length=1)
    documents: list[str] = Field(default_factory=list)
    context: str = Field(default='', description='Optional raw text context from frontend (e.g. demo document details)')
    history: list[dict[str, str]] = Field(default_factory=list, description='Conversation history [{role, content}]')


class MedicalEvidence(BaseModel):
    documentName: str
    section: str
    sourceId: str
    snippet: str
    score: float


class MedicalAnswerResponse(BaseModel):
    answer: str
    evidence: list[MedicalEvidence]
    confidence: str
    sourceCount: int
    provider: str | None = None
    model: str | None = None


class TimelineEvent(BaseModel):
    id: str
    date: str
    title: str
    type: str
    description: str
    documentId: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class TimelineResponse(BaseModel):
    events: list[TimelineEvent]


class CompareRequest(BaseModel):
    leftReport: str = Field(..., min_length=1)
    rightReport: str = Field(..., min_length=1)


class CompareRow(BaseModel):
    field: str
    previousValue: str
    currentValue: str
    changeType: str
    detail: str


class DocumentDetailResponse(BaseModel):
    document_id: str
    title: str
    filename: str
    content_type: str
    text: str
    chunks: int
    metadata: dict[str, Any]
    processed: bool
    created_at: str
    status: str = 'uploaded'
    error_message: str | None = None
    page_count: int | None = None


class CompareResponse(BaseModel):
    summary: str
    changes: list[CompareRow]
    provider: str | None = None
    model: str | None = None
    additions: list[str] | None = None
    removals: list[str] | None = None


@app.get('/api/health', response_model=HealthResponse)
def health() -> dict[str, str]:
    return {
        'status': 'ok',
        'app_name': settings.app_name,
        'environment': settings.environment,
    }


@app.post('/api/documents/upload', response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    current_user: AuthUser = Depends(get_auth_user),
) -> dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail='A filename is required.')

    # Validate file extension early — gives a clear 415 before any I/O.
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in _ALLOWED_EXTENSIONS:
        allowed = ', '.join(sorted(_ALLOWED_EXTENSIONS))
        raise HTTPException(
            status_code=415,
            detail=f'Unsupported file type "{ext or "(none)"}". Allowed types: {allowed}.',
        )

    document_id = str(uuid.uuid4())
    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:  # 50MB
        raise HTTPException(status_code=413, detail='File too large. Maximum size is 50MB.')

    content_type = file.content_type or 'application/octet-stream'
    metadata = extract_metadata(file.filename, content_type)
    created_at = datetime.now(timezone.utc).isoformat()

    # Supabase sync — the shared source of truth across serverless instances.
    # Only rows with a real user UUID are stored; ownerless rows could never be
    # resolved back to a user later.
    owner_id = current_user.sub if _is_uuid(current_user.sub) else None
    safe_name = os.path.basename(file.filename)
    storage_path = f"{owner_id or 'local'}/{document_id}/{safe_name}"

    # ── State 1: 'uploaded' — the row exists before any processing starts ──
    supabase_synced = False
    if supabase_service.is_available() and owner_id:
        saved = supabase_service.save_document(
            user_id=owner_id,
            document_id=document_id,
            file_name=file.filename,
            document_type=str(metadata.get('file_type') or 'document'),
            extracted_text='',
            processing_status='uploaded',
            storage_path=storage_path,
        )
        supabase_synced = saved is not None

    # ── Raw file → Supabase Storage (private 'medical-documents' bucket) ──
    storage_synced = False
    if supabase_synced:
        storage_synced = supabase_service.upload_file_to_storage(
            contents, storage_path, content_type,
        )
        if not storage_synced:
            logger.warning(
                'Document %s: metadata saved but the raw file could not be '
                'uploaded to storage', document_id,
            )

    # ── State 2: 'processing' — persisted before OCR runs, so a crash mid-OCR
    #    leaves an honest in-progress row instead of a silent hole ──
    if supabase_synced:
        supabase_service.update_document(
            document_id, user_id=owner_id, processing_status='processing',
        )

    # ── Real OCR extraction (PaddleOCR for images/scans, PyMuPDF for PDFs) ──
    ocr_result: dict[str, Any] | None = None
    text = ''
    if _ocr_ok:
        ocr_result = await asyncio.to_thread(extract_text_structured, contents, file.filename)
        text = ocr_result['full_text'] if ocr_result else ''
        # Page markers without any alphanumeric content count as empty.
        if text and not re.search(r'[0-9a-zA-Z]', text):
            text = ''
    if not text:
        # Legacy fallback for genuinely text-based (non-scanned) files: the
        # raw decode is only kept when it is overwhelmingly printable text.
        legacy = extract_text_from_bytes(contents, file.filename)
        if legacy != NO_READABLE_TEXT and re.search(r'[0-9a-zA-Z]', legacy):
            text = legacy
            ocr_result = None  # discard unhelpful OCR metadata

    extraction_errors = [
        str(error) for error in ((ocr_result or {}).get('errors') or []) if error
    ]

    # ── State 3a: 'failed' — OCR produced nothing; record it honestly ──
    if not text.strip():
        error_message = 'OCR could not extract any readable text from this document.'
        if extraction_errors:
            error_message += ' ' + '; '.join(extraction_errors[:3])
        doc = DocumentRecord(
            document_id=document_id,
            title=title or file.filename,
            filename=file.filename,
            content_type=content_type,
            text='',
            chunks=[],
            metadata=metadata,
            processed=False,
            created_at=created_at,
            owner=current_user.email,
            status='failed',
            error_message=error_message,
        )
        store.add(doc)
        if supabase_synced:
            supabase_service.update_document(
                document_id,
                user_id=owner_id,
                processing_status='failed',
                error_message=error_message,
            )
        logger.warning('Document %s marked failed: %s', document_id, error_message)
        return {
            'document_id': document_id,
            'title': doc.title,
            'filename': doc.filename,
            'status': 'failed',
            'supabase_synced': supabase_synced,
            'storage_synced': storage_synced,
            'error_message': error_message,
            'page_count': None,
        }

    # ── State 3b: 'processed' — real extracted text, chunked for retrieval ──
    chunks = chunk_text(text)
    if ocr_result:
        metadata['ocr_details'] = ocr_result
    page_count = int((ocr_result or {}).get('page_count') or 1)
    doc = DocumentRecord(
        document_id=document_id,
        title=title or file.filename,
        filename=file.filename,
        content_type=content_type,
        text=text,
        chunks=chunks,
        metadata=metadata,
        processed=True,
        created_at=created_at,
        owner=current_user.email,
        status='processed',
        error_message=None,
    )
    store.add(doc)

    if supabase_synced:
        supabase_service.update_document(
            document_id,
            user_id=owner_id,
            processing_status='processed',
            extracted_text=text,
            page_count=page_count,
            ocr_metadata=summarize_ocr_details(ocr_result) if ocr_result else None,
        )

    return {
        'document_id': document_id,
        'title': doc.title,
        'filename': doc.filename,
        'status': 'processed',
        'supabase_synced': supabase_synced,
        'storage_synced': storage_synced,
        'error_message': None,
        'page_count': page_count,
    }


@app.get('/api/documents/{document_id}', response_model=DocumentDetailResponse)
def get_document(
    document_id: str,
    current_user: AuthUser = Depends(get_auth_user),
) -> dict[str, Any]:
    """Real stored document record, used by the Documents detail page when a
    Timeline deep-link points at a backend document."""
    document = _resolve_document(document_id, current_user)
    if document is None:
        raise HTTPException(status_code=404, detail='Document not found.')
    return {
        'document_id': document.document_id,
        'title': document.title,
        'filename': document.filename,
        'content_type': document.content_type,
        'text': document.text,
        'chunks': len(document.chunks),
        'metadata': document.metadata,
        'processed': document.processed,
        'created_at': document.created_at,
        'status': document.status,
        'error_message': document.error_message,
        'page_count': (document.metadata.get('ocr_details') or {}).get('page_count')
        if isinstance(document.metadata.get('ocr_details'), dict)
        else None,
    }


@app.get('/api/documents', response_model=list[DocumentDetailResponse])
def list_documents(
    current_user: AuthUser = Depends(get_auth_user),
) -> list[dict[str, Any]]:
    """List the authenticated user's stored documents, newest first."""
    documents = []
    seen_ids: set[str] = set()
    for document in store.list():
        if document.owner != current_user.email:
            continue
        seen_ids.add(document.document_id)
        documents.append({
            'document_id': document.document_id,
            'title': document.title,
            'filename': document.filename,
            'content_type': document.content_type,
            'text': document.text,
            'chunks': len(document.chunks),
            'metadata': document.metadata,
            'processed': document.processed,
            'created_at': document.created_at,
            'status': document.status,
            'error_message': document.error_message,
            'page_count': (document.metadata.get('ocr_details') or {}).get('page_count')
            if isinstance(document.metadata.get('ocr_details'), dict)
            else None,
        })
    # Merge documents persisted in Supabase that this instance hasn't seen.
    if supabase_service.is_available() and _is_uuid(current_user.sub):
        for row in supabase_service.list_user_documents(user_id=current_user.sub):
            row_id = str(row.get('id') or '')
            if not row_id or row_id in seen_ids:
                continue
            text = str(row.get('extracted_text') or '')
            filename = str(row.get('file_name') or row_id)
            row_status = _normalize_status(row.get('processing_status'))
            documents.append({
                'document_id': row_id,
                'title': filename,
                'filename': filename,
                'content_type': 'application/octet-stream',
                'text': text,
                'chunks': len(chunk_text(text)),
                'metadata': {'filename': filename, 'file_type': row.get('document_type')},
                'processed': row_status == 'processed',
                'created_at': str(row.get('created_at') or ''),
                'status': row_status,
                'error_message': row.get('error_message'),
                'page_count': row.get('page_count'),
            })
    documents.sort(key=lambda d: d['created_at'], reverse=True)
    return documents


@app.post('/api/documents/process', response_model=ProcessDocumentResponse)
async def process_document(
    payload: ProcessDocumentRequest,
    current_user: AuthUser = Depends(get_auth_user),
) -> dict[str, Any]:
    document = _resolve_document(payload.document_id, current_user)
    if document is None:
        raise HTTPException(status_code=404, detail='Document not found.')

    # Documents whose OCR failed stay failed — never pretend empty text is
    # successfully processed.
    if document.status == 'failed' or not document.text.strip():
        return {
            'document_id': document.document_id,
            'chunks': 0,
            'metadata': document.metadata,
            'processed': False,
            'status': 'failed',
            'error_message': document.error_message
            or 'No extracted text is available for this document.',
            'ocr_details': document.metadata.get('ocr_details'),
        }

    chunks = chunk_text(document.text)
    document.chunks = chunks
    document.processed = True
    document.status = 'processed'
    store.update(document.document_id, chunks=chunks, processed=True, status='processed')

    return {
        'document_id': document.document_id,
        'chunks': len(chunks),
        'metadata': document.metadata,
        'processed': True,
        'status': 'processed',
        'error_message': None,
        'ocr_details': document.metadata.get('ocr_details'),
    }


def _auto_load_user_documents(current_user: AuthUser, limit: int = 3) -> list[DocumentRecord]:
    """Load the user's most recent documents when none are explicitly selected.

    Searches local store first, then Supabase, returning up to *limit* records
    that have non-empty extracted text (so the RAG pipeline has real content to
    work with)."""
    results: list[DocumentRecord] = []
    seen_ids: set[str] = set()

    # 1. Local store — already hydrated documents for this user.
    for document in store.list():
        if document.owner != current_user.email:
            continue
        if not document.text:
            continue
        if not document.chunks:
            document.chunks = chunk_text(document.text)
        results.append(document)
        seen_ids.add(document.document_id)
        if len(results) >= limit:
            return results

    # 2. Supabase — hydrate any remaining documents not yet in local store.
    if supabase_service.is_available() and _is_uuid(current_user.sub):
        for row in supabase_service.list_user_documents(user_id=current_user.sub):
            row_id = str(row.get('id') or '')
            if not row_id or row_id in seen_ids:
                continue
            text = str(row.get('extracted_text') or '')
            if not text:
                continue
            filename = str(row.get('file_name') or row_id)
            document = DocumentRecord(
                document_id=row_id,
                title=filename,
                filename=filename,
                content_type='application/octet-stream',
                text=text,
                chunks=chunk_text(text),
                metadata={'filename': filename, 'file_type': row.get('document_type')},
                processed=True,
                status=_normalize_status(row.get('processing_status')),
                created_at=str(row.get('created_at') or ''),
                owner=current_user.email,
            )
            store.documents[row_id] = document  # cache for this instance
            results.append(document)
            seen_ids.add(row_id)
            if len(results) >= limit:
                break

    return results


@app.post('/api/medical-answer', response_model=MedicalAnswerResponse)
async def medical_answer(
    payload: MedicalAnswerRequest,
    current_user: AuthUser = Depends(get_auth_user),
) -> dict[str, Any]:
    docs: list[DocumentRecord] = []
    for document_id in payload.documents:
        try:
            document = _resolve_document(document_id, current_user)
        except HTTPException:
            continue  # never leak existence of other users' documents
        if document is not None:
            if not document.chunks and document.text:
                document.chunks = chunk_text(document.text)
            docs.append(document)

    # Auto-retrieve: when no documents are explicitly selected, load the user's
    # most recent documents so the AI always has context from uploaded reports.
    if not docs and not payload.documents:
        docs = _auto_load_user_documents(current_user)

    if payload.documents and not docs and not payload.context:
        raise HTTPException(
            status_code=404,
            detail='None of the referenced documents were found in the backend store. Upload documents first or provide context text.',
        )

    result = await asyncio.to_thread(
        build_medical_answer,
        payload.question,
        docs,
        raw_context=payload.context or None,
        conversation_history=payload.history,
    )
    return result


@app.post('/api/compare-reports', response_model=CompareResponse)
async def compare_reports_endpoint(payload: CompareRequest) -> dict[str, Any]:
    return await asyncio.to_thread(compare_reports, payload.leftReport, payload.rightReport)


@app.get('/api/timeline', response_model=TimelineResponse)
def timeline(
    current_user: AuthUser = Depends(get_auth_user),
) -> dict[str, Any]:
    """Chronological timeline derived from the real uploaded documents in the
    store belonging to the authenticated user. One event per document; only
    information that actually exists on the record is exposed."""
    events = []
    for document in store.list():
        if document.owner != current_user.email:
            continue
        event_type = classify_document_event(document.filename, document.text)
        metadata = {
            'filename': document.filename,
            'content_type': document.content_type,
            'file_type': document.metadata.get('file_type'),
            'processed': document.processed,
            'status': document.status,
        }
        metadata = {key: value for key, value in metadata.items() if value is not None}
        events.append(TimelineEvent(
            id=f"evt-{document.document_id}",
            date=document.created_at,
            title=document.title,
            type=event_type,
            description=build_event_description(document.text),
            documentId=document.document_id,
            metadata=metadata,
        ))
    events.sort(key=lambda event: event.date, reverse=True)
    return {'events': [event.model_dump() for event in events]}


@app.get('/')
def root() -> dict[str, str]:
    return {'message': 'MediCare AI backend is running.'}
