from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.app.auth import AuthUser, get_auth_user
from backend.app.config import settings
from backend.app.document_pipeline import (
    build_event_description,
    chunk_text,
    classify_document_event,
    extract_metadata,
    extract_text_from_bytes,
)
from backend.app.providers import build_provider
from backend.app.rag import build_medical_answer, compare_reports
from backend.app.storage import DocumentRecord, build_document_store

app = FastAPI(title='MediCare AI Backend', version='0.1.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

store = build_document_store(settings.upload_dir)
provider = build_provider()


class HealthResponse(BaseModel):
    status: str
    app_name: str
    environment: str


class UploadResponse(BaseModel):
    document_id: str
    title: str
    filename: str
    status: str


class ProcessDocumentRequest(BaseModel):
    document_id: str


class ProcessDocumentResponse(BaseModel):
    document_id: str
    chunks: int
    metadata: dict[str, Any]
    processed: bool


class MedicalAnswerRequest(BaseModel):
    question: str = Field(..., min_length=1)
    documents: list[str] = Field(default_factory=list)


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
    title: str | None = None,
    current_user: AuthUser = Depends(get_auth_user),
) -> dict[str, str]:
    if not file.filename:
        raise HTTPException(status_code=400, detail='A filename is required.')

    document_id = str(uuid.uuid4())
    contents = await file.read()
    text = extract_text_from_bytes(contents, file.filename)
    metadata = extract_metadata(file.filename, file.content_type or 'application/octet-stream')
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
    return {
        'document_id': document_id,
        'title': doc.title,
        'filename': doc.filename,
        'status': 'uploaded',
    }


@app.get('/api/documents/{document_id}', response_model=DocumentDetailResponse)
def get_document(
    document_id: str,
    current_user: AuthUser = Depends(get_auth_user),
) -> dict[str, Any]:
    """Real stored document record, used by the Documents detail page when a
    Timeline deep-link points at a backend document."""
    document = store.get(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail='Document not found.')
    if document.owner != current_user.email:
        raise HTTPException(status_code=403, detail='Access denied.')
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
    for document in store.list():
        if document.owner != current_user.email:
            continue
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
    documents.sort(key=lambda d: d['created_at'], reverse=True)
    return documents


@app.post('/api/documents/process', response_model=ProcessDocumentResponse)
async def process_document(
    payload: ProcessDocumentRequest,
    current_user: AuthUser = Depends(get_auth_user),
) -> dict[str, Any]:
    document = store.get(payload.document_id)
    if document is None:
        raise HTTPException(status_code=404, detail='Document not found.')
    if document.owner != current_user.email:
        raise HTTPException(status_code=403, detail='Access denied.')

    chunks = chunk_text(document.text)
    document.chunks = chunks
    document.processed = True
    store.update(document.document_id, chunks=chunks, processed=True)

    return {
        'document_id': document.document_id,
        'chunks': len(chunks),
        'metadata': document.metadata,
        'processed': True,
    }


@app.post('/api/medical-answer', response_model=MedicalAnswerResponse)
async def medical_answer(
    payload: MedicalAnswerRequest,
    current_user: AuthUser = Depends(get_auth_user),
) -> dict[str, Any]:
    if not payload.documents:
        raise HTTPException(status_code=400, detail='At least one document is required to answer questions.')

    docs: list[DocumentRecord] = []
    for document_id in payload.documents:
        document = store.get(document_id)
        if document is not None and document.owner == current_user.email:
            docs.append(document)

    if not docs:
        raise HTTPException(status_code=404, detail='No matching documents were found for this request.')

    result = build_medical_answer(payload.question, docs)
    return result


@app.post('/api/compare-reports', response_model=CompareResponse)
async def compare_reports_endpoint(payload: CompareRequest) -> dict[str, Any]:
    return compare_reports(payload.leftReport, payload.rightReport)


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
