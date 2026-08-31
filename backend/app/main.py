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
    build_event_description,
    chunk_text,
    classify_document_event,
    extract_metadata,
    extract_text_from_bytes,
    extract_text_structured,
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
    document = DocumentRecord(
        document_id=str(row['id']),
        title=filename,
        filename=filename,
        content_type='application/octet-stream',
        text=text,
        chunks=chunk_text(text),
        metadata={'filename': filename, 'file_type': row.get('document_type')},
        processed=True,
        created_at=str(row.get('created_at') or ''),
        owner=current_user.email,
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
) -> dict[str, str]:
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

    # Extraction: use OCR pipeline when available, fall back to legacy extraction
    ocr_result: dict[str, Any] | None = None
    if _ocr_ok:
        ocr_result = await asyncio.to_thread(extract_text_structured, contents, file.filename)
        text = ocr_result['full_text'] if ocr_result else ''
        # Page markers without any alphanumeric content count as empty.
        if text and not re.search(r'[0-9a-zA-Z]', text):
            text = ''
        # Fall back to legacy extraction when OCR returns empty (e.g. minimal/stub PDFs)
        if not text:
            text = extract_text_from_bytes(contents, file.filename)
            ocr_result = None  # discard unhelpful OCR metadata
    else:
        text = extract_text_from_bytes(contents, file.filename)

    metadata = extract_metadata(file.filename, file.content_type or 'application/octet-stream')
    if ocr_result:
        metadata['ocr_details'] = ocr_result

    doc = DocumentRecord(
        document_id=document_id,
        title=title or file.filename,
        filename=file.filename,
        content_type=file.content_type or 'application/octet-stream',
        text=text,
        chunks=[],
        metadata=metadata,
        processed=False,
        created_at=datetime.now(timezone.utc).isoformat(),
        owner=current_user.email,
    )
    store.add(doc)

    # Supabase sync — the shared source of truth across serverless instances.
    # Only rows with a real user UUID are stored; ownerless rows could never be
    # resolved back to a user later.
    supabase_synced = False
    owner_id = current_user.sub if _is_uuid(current_user.sub) else None
    if supabase_service.is_available() and owner_id:
        saved = supabase_service.save_document(
            user_id=owner_id,
            document_id=document_id,
            file_name=file.filename,
            document_type=str(metadata.get('file_type') or 'document'),
            extracted_text=text,
            processing_status='completed',
        )
        supabase_synced = saved is not None

    return {
        'document_id': document_id,
        'title': doc.title,
        'filename': doc.filename,
        'status': 'uploaded',
        'supabase_synced': supabase_synced,
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
        })
    # Merge documents persisted in Supabase that this instance hasn't seen.
    if supabase_service.is_available() and _is_uuid(current_user.sub):
        for row in supabase_service.list_user_documents(user_id=current_user.sub):
            row_id = str(row.get('id') or '')
            if not row_id or row_id in seen_ids:
                continue
            text = str(row.get('extracted_text') or '')
            filename = str(row.get('file_name') or row_id)
            documents.append({
                'document_id': row_id,
                'title': filename,
                'filename': filename,
                'content_type': 'application/octet-stream',
                'text': text,
                'chunks': len(chunk_text(text)),
                'metadata': {'filename': filename, 'file_type': row.get('document_type')},
                'processed': True,
                'created_at': str(row.get('created_at') or ''),
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

    chunks = chunk_text(document.text)
    document.chunks = chunks
    document.processed = True
    store.update(document.document_id, chunks=chunks, processed=True)

    return {
        'document_id': document.document_id,
        'chunks': len(chunks),
        'metadata': document.metadata,
        'processed': True,
        'ocr_details': document.metadata.get('ocr_details'),
    }


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
