from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

try:
    from backend.app.ocr import extract_document, OCR_AVAILABLE, OCRDocumentResult
except ImportError:
    OCR_AVAILABLE = False

# Sentinel returned by the legacy byte-decode fallback when a file contains
# no readable text. Callers treat this exact string as "extraction failed" —
# it must never be persisted as extracted text.
NO_READABLE_TEXT = 'No readable text detected in the uploaded file.'


def extract_text_structured(file_bytes: bytes, filename: str) -> dict | None:
    """Run full OCR extraction and return structured result dict.

    Returns None when OCR dependencies are not available.
    """
    if not OCR_AVAILABLE:
        return None
    result = extract_document(file_bytes, filename)
    return result.to_dict()


def summarize_ocr_details(ocr_result: dict[str, Any]) -> dict[str, Any]:
    """Slim down an OCR result dict for database persistence.

    Keeps page-level information (numbers, methods, confidence, sizes) but
    drops per-box coordinates and page texts — the full text is already
    persisted in `extracted_text`, so this avoids storing it twice.
    """
    pages = ocr_result.get('pages') or []
    return {
        'extraction_method': ocr_result.get('extraction_method'),
        'page_count': ocr_result.get('page_count'),
        'average_confidence': ocr_result.get('average_confidence'),
        'processing_time_ms': ocr_result.get('processing_time_ms'),
        'pages': [
            {
                'page_number': page.get('page_number'),
                'method': page.get('method'),
                'confidence': page.get('confidence'),
                'char_count': len(str(page.get('text') or '')),
            }
            for page in pages
        ],
    }


def extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    text = file_bytes.decode('utf-8', errors='ignore')
    if not text.strip():
        return NO_READABLE_TEXT
    # Binary files (images, scanned PDFs) decode to garbage; only keep the raw
    # decode when it is overwhelmingly printable text (e.g. stub/plain-text PDFs).
    printable = sum(1 for ch in text if ch.isprintable() or ch in '\n\r\t')
    if printable / max(len(text), 1) < 0.9:
        return NO_READABLE_TEXT
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
    if not cleaned or cleaned == NO_READABLE_TEXT:
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
