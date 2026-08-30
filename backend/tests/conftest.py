"""Shared test fixtures for medical document OCR testing."""
from __future__ import annotations

import io

import pytest


@pytest.fixture(scope="session")
def medical_text_content() -> str:
    """Realistic medical lab report text used across multiple fixtures."""
    return """\
METROPOLITAN MEDICAL CENTER
Laboratory Report

Patient: Jane A. Doe          DOB: 03/15/1978
MRN: MED-2024-78432           Gender: Female
Physician: Dr. Robert Chen    Collection Date: 01/15/2024
                               Report Date: 01/16/2024

COMPLETE BLOOD COUNT (CBC)
Test Name            Result    Units      Reference Range
WBC                  7.2       x10^3/uL   4.5-11.0
RBC                  4.65      x10^6/uL   4.00-5.50
Hemoglobin (Hgb)     13.8      g/dL       12.0-16.0
Hematocrit (Hct)     41.2      %          36.0-46.0
Platelets (PLT)      245       x10^3/uL   150-400
MCV                  88.6      fL         80.0-100.0
MCH                  29.7      pg         27.0-33.0
MCHC                 33.5      g/dL       32.0-36.0

BASIC METABOLIC PANEL (BMP)
Test Name            Result    Units      Reference Range
Glucose              98.5      mg/dL      70-100
BUN                  14        mg/dL      7-20
Creatinine           0.92      mg/dL      0.60-1.20
Sodium               141       mEq/L      136-145
Potassium            4.1       mEq/L      3.5-5.0
Chloride             103       mEq/L      98-106
CO2                  24        mEq/L      23-29
Calcium              9.4       mg/dL      8.5-10.5

ADDITIONAL TESTS
HbA1c                6.4       %          4.0-5.6      HIGH
TSH                  2.15      mIU/L      0.40-4.00
Total Cholesterol    192       mg/dL      <200
LDL Cholesterol      118       mg/dL      <100         HIGH
HDL Cholesterol      54        mg/dL      >40
Triglycerides        156       mg/dL      <150         HIGH

Medication: Metformin 500mg twice daily
Blood Pressure: 128/82 mmHg
SpO2: 98%

Notes: Patient shows well-controlled diabetes with slightly elevated
HbA1c. Lipid panel shows borderline values. Recommend dietary
modifications and follow-up in 3 months.

Electronically signed by: Dr. Robert Chen, MD
Report ID: LAB-2024-001587
"""


@pytest.fixture(scope="session")
def digital_pdf_bytes(medical_text_content: str) -> bytes:
    """Create a real PDF with selectable/searchable medical text."""
    import pymupdf

    doc = pymupdf.open()
    page = doc.new_page()
    text_point = pymupdf.Point(50, 50)
    page.insert_text(text_point, medical_text_content, fontsize=10)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@pytest.fixture(scope="session")
def medical_image_bytes(medical_text_content: str) -> bytes:
    """Render the medical text as a PNG image using Pillow."""
    from PIL import Image, ImageDraw

    img = Image.new("RGB", (800, 1200), "white")
    draw = ImageDraw.Draw(img)
    y = 20
    for line in medical_text_content.split("\n"):
        draw.text((20, y), line, fill="black")
        y += 16
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture(scope="session")
def scanned_pdf_bytes(medical_image_bytes: bytes) -> bytes:
    """Create a PDF where the page is an embedded image (simulates a scan)."""
    import pymupdf

    doc = pymupdf.open()
    page = doc.new_page(width=800, height=1200)
    page.insert_image(page.rect, stream=medical_image_bytes)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@pytest.fixture(scope="session")
def multi_page_pdf_bytes(medical_text_content: str, medical_image_bytes: bytes) -> bytes:
    """PDF with page 1 as native text, page 2 as embedded image."""
    import pymupdf

    doc = pymupdf.open()
    # Page 1: native text
    page1 = doc.new_page()
    page1.insert_text(pymupdf.Point(50, 50), medical_text_content[:500], fontsize=10)
    # Page 2: scanned image
    page2 = doc.new_page(width=800, height=1200)
    page2.insert_image(page2.rect, stream=medical_image_bytes)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


# ---------------------------------------------------------------------------
# Edge-case fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def empty_bytes() -> bytes:
    return b""


@pytest.fixture(scope="session")
def corrupt_pdf_bytes() -> bytes:
    return b"not a real pdf file corrupt data here"


@pytest.fixture(scope="session")
def corrupt_image_bytes() -> bytes:
    return b"PNG fake image data not real"


@pytest.fixture(scope="session")
def blank_image_bytes() -> bytes:
    """White image with no text."""
    from PIL import Image

    img = Image.new("RGB", (400, 300), "white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
