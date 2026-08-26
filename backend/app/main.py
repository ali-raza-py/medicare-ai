from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.app.config import settings
from backend.app.document_pipeline import chunk_text, extract_metadata, extract_text_from_bytes
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


class CompareRequest(BaseModel):
    leftReport: str = Field(..., min_length=1)
    rightReport: str = Field(..., min_length=1)


class CompareRow(BaseModel):
    field: str
    previousValue: str
    currentValue: str
    changeType: str
    detail: str


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
async def upload_document(file: UploadFile = File(...), title: str | None = None) -> dict[str, str]:
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
    )
    store.add(doc)
    return {
        'document_id': document_id,
        'title': doc.title,
        'filename': doc.filename,
        'status': 'uploaded',
    }


@app.post('/api/documents/process', response_model=ProcessDocumentResponse)
async def process_document(payload: ProcessDocumentRequest) -> dict[str, Any]:
    document = store.get(payload.document_id)
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
    }


@app.post('/api/medical-answer', response_model=MedicalAnswerResponse)
async def medical_answer(payload: MedicalAnswerRequest) -> dict[str, Any]:
    if not payload.documents:
        raise HTTPException(status_code=400, detail='At least one document is required to answer questions.')

    docs: list[DocumentRecord] = []
    for document_id in payload.documents:
        document = store.get(document_id)
        if document is not None:
            docs.append(document)

    if not docs:
        raise HTTPException(status_code=404, detail='No matching documents were found for this request.')

    result = build_medical_answer(payload.question, docs)
    return result


@app.post('/api/compare-reports', response_model=CompareResponse)
async def compare_reports_endpoint(payload: CompareRequest) -> dict[str, Any]:
    return compare_reports(payload.leftReport, payload.rightReport)


@app.get('/')
def root() -> dict[str, str]:
    return {'message': 'MediCare AI backend is running.'}
