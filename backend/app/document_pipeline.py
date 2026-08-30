from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

try:
    from backend.app.ocr import extract_document, OCR_AVAILABLE, OCRDocumentResult
except ImportError:
    OCR_AVAILABLE = False


def extract_text_structured(file_bytes: bytes, filename: str) -> dict | None:
    """Run full OCR extraction and return structured result dict.

    Returns None when OCR dependencies are not available.
    """
    if not OCR_AVAILABLE:
        return None
    result = extract_document(file_bytes, filename)
    return result.to_dict()


def extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    text = file_bytes.decode('utf-8', errors='ignore')
    if not text.strip():
        return 'No readable text detected in the uploaded file.'
    return text


def extract_metadata(filename: str, content_type: str) -> dict[str, Any]:
    return {
        'filename': filename,
        'content_type': content_type,
        'file_type': 'pdf' if filename.lower().endswith('.pdf') else 'image',
        'extracted_at': datetime.now(timezone.utc).isoformat(),
    }


def classify_document_event(filename: str, text: str) -> str:
    """Map a stored document to a Timeline event type using only what the
    document actually contains (filename + extracted text). Defaults to
    'Medical Report' rather than guessing a type the data doesn't support."""
    haystack = f"{filename} {text}".lower()
    if any(word in haystack for word in ('x-ray', 'xray', 'ultrasound', 'mri', 'ct scan', 'imaging', 'radiology')):
        return 'Imaging'
    if any(word in haystack for word in ('hba1c', 'cholesterol', 'blood count', 'cbc', 'lipid', 'glucose', 'serum', 'panel', 'vitamin d')):
        return 'Lab Result'
    if any(word in haystack for word in ('prescription', 'medication', 'metformin', 'dosage')):
        return 'Medication'
    if any(word in haystack for word in ('diagnosis', 'diagnosed')):
        return 'Diagnosis'
    return 'Medical Report'


def build_event_description(text: str, limit: int = 240) -> str:
    """Honest, real extract: the beginning of the document's extracted text."""
    cleaned = re.sub(r'\s+', ' ', text).strip()
    if not cleaned or cleaned == 'No readable text detected in the uploaded file.':
        return 'No readable text could be extracted from this document.'
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[:limit].rsplit(' ', 1)[0] + '…'


def chunk_text(text: str, *, chunk_size: int = 200) -> list[str]:
    cleaned = re.sub(r'\s+', ' ', text).strip()
    if not cleaned:
        return []
    words = cleaned.split()
    chunks: list[str] = []
    for index in range(0, len(words), chunk_size):
        chunk = ' '.join(words[index:index + chunk_size])
        if chunk:
            chunks.append(chunk)
    return chunks or [cleaned]


def build_source_reference(document_id: str, chunk_index: int, snippet: str) -> dict[str, Any]:
    return {
        'document_id': document_id,
        'chunk_index': chunk_index,
        'snippet': snippet,
    }
