"""Tests for the OCR module (backend.app.ocr)."""
from __future__ import annotations

import json
from unittest.mock import patch

import pytest

from backend.app.ocr import OCR_AVAILABLE, OCRDocumentResult, extract_document

# _PADDLE_AVAILABLE is a private flag; import it for fine-grained skip logic.
try:
    from backend.app.ocr import _PADDLE_AVAILABLE
except ImportError:
    _PADDLE_AVAILABLE = False

requires_ocr = pytest.mark.skipif(not OCR_AVAILABLE, reason="OCR dependencies not available")
requires_paddle = pytest.mark.skipif(not _PADDLE_AVAILABLE, reason="PaddleOCR not available")


# ---------------------------------------------------------------------------
# 1. Native PDF extraction (PyMuPDF only — no Paddle needed)
# ---------------------------------------------------------------------------

@requires_ocr
def test_native_pdf_extraction(digital_pdf_bytes: bytes) -> None:
    result = extract_document(digital_pdf_bytes, "report.pdf")

    assert isinstance(result, OCRDocumentResult)
    assert result.page_count >= 1
    # Key medical values must survive round-trip through PDF
    for needle in ("7.2", "4.65", "13.8", "98.5", "6.4", "HbA1c", "Metformin"):
        assert needle in result.full_text, f"Expected '{needle}' in extracted text"
    # Every page should be native extraction
    for page in result.pages:
        assert page.method == "native"
    assert result.average_confidence == 1.0
    assert result.extraction_method == "native_pdf"


# ---------------------------------------------------------------------------
# 2. Image OCR (requires PaddleOCR)
# ---------------------------------------------------------------------------

@requires_paddle
def test_image_ocr_extraction(medical_image_bytes: bytes) -> None:
    result = extract_document(medical_image_bytes, "report.png")

    assert result.page_count == 1
    assert result.extraction_method == "ocr_image"
    assert result.full_text.strip() != ""
    assert result.pages[0].method == "ocr"
    assert result.pages[0].confidence > 0
    assert len(result.pages[0].boxes) > 0


# ---------------------------------------------------------------------------
# 3. Scanned PDF OCR (requires PaddleOCR)
# ---------------------------------------------------------------------------

@requires_paddle
def test_scanned_pdf_ocr(scanned_pdf_bytes: bytes) -> None:
    result = extract_document(scanned_pdf_bytes, "scanned.pdf")

    assert result.extraction_method in ("ocr_pdf", "mixed_pdf")
    assert result.full_text.strip() != ""
    assert any(p.method == "ocr" for p in result.pages)


# ---------------------------------------------------------------------------
# 4. Mixed PDF — page 1 native, page 2 OCR (requires PaddleOCR)
# ---------------------------------------------------------------------------

@requires_paddle
def test_mixed_pdf(multi_page_pdf_bytes: bytes) -> None:
    result = extract_document(multi_page_pdf_bytes, "mixed.pdf")

    assert result.page_count == 2
    assert result.extraction_method == "mixed_pdf"
    assert result.pages[0].method == "native"
    assert result.pages[1].method == "ocr"


# ---------------------------------------------------------------------------
# 5. Empty file
# ---------------------------------------------------------------------------

@requires_ocr
def test_empty_file() -> None:
    result = extract_document(b"", "empty.pdf")

    assert result.full_text == ""
    assert len(result.errors) > 0
    error_msg = " ".join(result.errors).lower()
    assert "empty" in error_msg


# ---------------------------------------------------------------------------
# 6. Corrupt PDF
# ---------------------------------------------------------------------------

@requires_ocr
def test_corrupt_pdf(corrupt_pdf_bytes: bytes) -> None:
    result = extract_document(corrupt_pdf_bytes, "bad.pdf")

    # Must NOT raise; errors list should be populated
    assert len(result.errors) > 0


# ---------------------------------------------------------------------------
# 7. Unreadable / corrupt image
# ---------------------------------------------------------------------------

@requires_ocr
def test_unreadable_image(corrupt_image_bytes: bytes) -> None:
    result = extract_document(corrupt_image_bytes, "bad.png")

    # Must NOT raise; errors list should be populated
    assert len(result.errors) > 0


# ---------------------------------------------------------------------------
# 8. Large file rejection (>50 MB)
# ---------------------------------------------------------------------------

@requires_ocr
def test_large_file_rejection() -> None:
    big = b"x" * (51 * 1024 * 1024)
    result = extract_document(big, "huge.pdf")

    assert len(result.errors) > 0
    error_msg = " ".join(result.errors).lower()
    assert "large" in error_msg or "size" in error_msg


# ---------------------------------------------------------------------------
# 9. Structured result fields and JSON serialisation
# ---------------------------------------------------------------------------

@requires_ocr
def test_structured_result_fields(digital_pdf_bytes: bytes) -> None:
    result = extract_document(digital_pdf_bytes, "report.pdf")

    # All expected attributes present
    for attr in (
        "pages", "full_text", "page_count", "average_confidence",
        "extraction_method", "processing_time_ms", "errors",
    ):
        assert hasattr(result, attr), f"Missing attribute: {attr}"

    d = result.to_dict()
    assert isinstance(d, dict)
    for key in (
        "pages", "full_text", "page_count", "average_confidence",
        "extraction_method", "processing_time_ms", "errors",
    ):
        assert key in d, f"Missing key in to_dict(): {key}"

    # Must be JSON-serializable
    serialised = json.dumps(d)
    assert isinstance(serialised, str)


# ---------------------------------------------------------------------------
# 10. OCR accuracy — medical numbers (requires PaddleOCR)
# ---------------------------------------------------------------------------

@requires_paddle
def test_ocr_accuracy_medical_numbers(medical_image_bytes: bytes) -> None:
    result = extract_document(medical_image_bytes, "report.png")
    text = result.full_text

    expected_values = ["7.2", "4.65", "13.8", "98.5", "6.4", "128/82", "245"]
    found = 0
    for val in expected_values:
        if val in text:
            found += 1
            print(f"  FOUND: {val}")
        else:
            print(f"  MISSING: {val}")

    accuracy = found / len(expected_values)
    print(f"Accuracy: {found}/{len(expected_values)} ({accuracy:.0%})")
    assert accuracy >= 0.5, f"OCR accuracy too low: {accuracy:.0%}"


# ---------------------------------------------------------------------------
# 11. OCR accuracy — dates (requires PaddleOCR)
# ---------------------------------------------------------------------------

@requires_paddle
def test_ocr_accuracy_dates(medical_image_bytes: bytes) -> None:
    result = extract_document(medical_image_bytes, "report.png")
    text = result.full_text

    dates = ["03/15/1978", "01/15/2024", "01/16/2024"]
    for d in dates:
        status = "FOUND" if d in text else "MISSING"
        print(f"  {status}: {d}")

    assert any(d in text for d in dates), "No dates found in OCR output"


# ---------------------------------------------------------------------------
# 12. OCR accuracy — table layout / lab test names (requires PaddleOCR)
# ---------------------------------------------------------------------------

@requires_paddle
def test_ocr_accuracy_table_layout(medical_image_bytes: bytes) -> None:
    result = extract_document(medical_image_bytes, "report.png")
    text = result.full_text

    lab_names = ["WBC", "RBC", "Hemoglobin", "Glucose", "HbA1c"]
    for name in lab_names:
        status = "FOUND" if name in text else "MISSING"
        print(f"  {status}: {name}")

    found = sum(1 for n in lab_names if n in text)
    assert found >= 3, f"Only {found}/{len(lab_names)} lab test names found"


# ---------------------------------------------------------------------------
# 13. Fallback behaviour when OCR_AVAILABLE is False
# ---------------------------------------------------------------------------

def test_fallback_without_ocr() -> None:
    """When OCR is disabled the pipeline falls back to synthetic text."""
    from backend.app.document_pipeline import extract_text_from_bytes

    fake_pdf = b"%PDF-1.4\nPatient history: blood pressure 122/78 and HbA1c 6.4%.\n%%EOF\n"

    with patch("backend.app.document_pipeline.OCR_AVAILABLE", False):
        text = extract_text_from_bytes(fake_pdf, "report.pdf")

    # The legacy extractor should return synthetic text containing medical values
    assert "blood pressure" in text.lower() or "hba1c" in text.lower()


# ---------------------------------------------------------------------------
# 14. Unsupported file extension
# ---------------------------------------------------------------------------

@requires_ocr
def test_unsupported_extension() -> None:
    result = extract_document(b"some data", "file.docx")

    assert len(result.errors) > 0
    error_msg = " ".join(result.errors).lower()
    assert "unsupported" in error_msg or "docx" in error_msg
