from __future__ import annotations

import asyncio
import io
import logging
import os
import threading
import time
from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# Environment configuration — must run BEFORE any Paddle / imgaug imports
# ---------------------------------------------------------------------------

# Disable OneDNN (MKL-DNN).  PaddlePaddle 3.x enables OneDNN by default,
# which causes NotFoundError with fused_conv2d on some CPU backends.
# paddleocr's own utility.py calls config.disable_onednn() when
# enable_mkldnn is False, but setting the flag here guarantees the
# behaviour regardless of call order or entry point.
os.environ.setdefault('FLAGS_use_mkldnn', '0')

# ---------------------------------------------------------------------------
# numpy 2.x compatibility shim for imgaug 0.4.0
# ---------------------------------------------------------------------------
# imgaug 0.4.0 (pinned transitive dep of paddleocr>=2.9) still references
# numpy type aliases that were deprecated in 1.20 and removed in 2.0:
#   np.bool, np.complex  (found in polys.py, parameters.py, meta.py)
# We restore them in-place so imgaug works without patching site-packages.
import numpy as _np

if not hasattr(_np, 'bool'):
    _np.bool = _np.bool_        # type: ignore[attr-defined]
if not hasattr(_np, 'complex'):
    _np.complex = _np.complex128  # type: ignore[attr-defined]
if not hasattr(_np, 'int'):
    _np.int = _np.int_          # type: ignore[attr-defined]
if not hasattr(_np, 'float'):
    _np.float = _np.float64     # type: ignore[attr-defined]

logger = logging.getLogger(__name__)

try:
    import pymupdf as fitz
    _PYMUPDF_AVAILABLE = True
except ImportError:
    _PYMUPDF_AVAILABLE = False

try:
    from paddleocr import PaddleOCR
    _PADDLE_AVAILABLE = True
except ImportError:
    PaddleOCR = None  # type: ignore[assignment,misc]
    _PADDLE_AVAILABLE = False

try:
    import numpy as np
    from PIL import Image
    _HELPERS_AVAILABLE = True
except ImportError:
    _HELPERS_AVAILABLE = False

# OCR is available when pymupdf is present (real PDF text extraction).
# PaddleOCR is optional — scanned-page OCR degrades gracefully without it.
OCR_AVAILABLE = _PYMUPDF_AVAILABLE

_MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

_PDF_EXTENSIONS = {'.pdf'}
_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}

# ---------------------------------------------------------------------------
# Lazy PaddleOCR singleton
# ---------------------------------------------------------------------------

_ocr_engine: 'PaddleOCR | None' = None
_ocr_lock = threading.Lock()


def _get_ocr_engine() -> 'PaddleOCR':
    """Return a cached PaddleOCR singleton, creating it on first call.

    Model download and initialization happen inside PaddleOCR.__init__().
    The engine is cached so subsequent calls skip all setup overhead.
    """
    global _ocr_engine
    if _ocr_engine is not None:
        return _ocr_engine
    with _ocr_lock:
        if _ocr_engine is not None:
            return _ocr_engine
        if not _PADDLE_AVAILABLE or PaddleOCR is None:
            raise RuntimeError('PaddleOCR is not installed')
        logger.info('Initializing PaddleOCR engine (first call)')
        _ocr_engine = PaddleOCR(
            use_angle_cls=True,
            lang='en',
            show_log=False,
            # OneDNN is disabled via env var at module top; passing
            # enable_mkldnn=False ensures paddleocr also calls
            # config.disable_onednn() on the inference config.
            enable_mkldnn=False,
        )
        return _ocr_engine


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class OCRBoxResult:
    text: str
    confidence: float
    bbox: list[list[float]]  # 4-point polygon [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]


@dataclass
class OCRPageResult:
    page_number: int
    text: str
    confidence: float
    boxes: list[OCRBoxResult]
    method: str  # "native" or "ocr"


@dataclass
class OCRDocumentResult:
    pages: list[OCRPageResult]
    full_text: str
    page_count: int
    average_confidence: float
    extraction_method: str  # "native_pdf", "ocr_pdf", "mixed_pdf", "ocr_image"
    processing_time_ms: float
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        """Return a JSON-serializable dict representation."""
        return {
            'pages': [
                {
                    'page_number': page.page_number,
                    'text': page.text,
                    'confidence': page.confidence,
                    'boxes': [
                        {
                            'text': box.text,
                            'confidence': box.confidence,
                            'bbox': box.bbox,
                        }
                        for box in page.boxes
                    ],
                    'method': page.method,
                }
                for page in self.pages
            ],
            'full_text': self.full_text,
            'page_count': self.page_count,
            'average_confidence': self.average_confidence,
            'extraction_method': self.extraction_method,
            'processing_time_ms': self.processing_time_ms,
            'errors': list(self.errors),
        }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _empty_result(errors: list[str], processing_time_ms: float = 0.0) -> OCRDocumentResult:
    """Build an empty/error OCRDocumentResult."""
    return OCRDocumentResult(
        pages=[],
        full_text='',
        page_count=0,
        average_confidence=0.0,
        extraction_method='error',
        processing_time_ms=processing_time_ms,
        errors=errors,
    )


def _parse_ocr_result(raw_result: list) -> tuple[str, float, list[OCRBoxResult]]:
    """Parse a single-image PaddleOCR result into text, confidence, and boxes.

    PaddleOCR 3.x ``ocr()`` returns a list (per image) where each element is:
        [[[x1,y1],[x2,y2],[x3,y3],[x4,y4]], (text, confidence)]
    """
    if not raw_result:
        return '', 0.0, []

    # The outer list wraps per-image results; we pass a single image so take [0].
    page_results = raw_result[0] if isinstance(raw_result[0], list) and len(raw_result) == 1 else raw_result
    if page_results is None:
        return '', 0.0, []

    boxes: list[OCRBoxResult] = []
    for item in page_results:
        bbox = item[0]  # [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
        rec = item[1]   # (text, confidence)
        text = rec[0]
        confidence = float(rec[1])
        # Ensure bbox is list of lists of float
        bbox_clean = [[float(p[0]), float(p[1])] for p in bbox]
        boxes.append(OCRBoxResult(text=text, confidence=confidence, bbox=bbox_clean))

    # Sort by vertical position (top of bbox) then horizontal for reading order
    boxes.sort(key=lambda b: (min(p[1] for p in b.bbox), min(p[0] for p in b.bbox)))

    full_text = '\n'.join(box.text for box in boxes)
    avg_conf = sum(box.confidence for box in boxes) / len(boxes) if boxes else 0.0

    return full_text, avg_conf, boxes


# ---------------------------------------------------------------------------
# PDF extraction
# ---------------------------------------------------------------------------

def _extract_pdf(file_bytes: bytes) -> OCRDocumentResult:
    """Extract text from a PDF using native text first, falling back to OCR."""
    errors: list[str] = []
    pages: list[OCRPageResult] = []

    try:
        doc = fitz.open(stream=file_bytes, filetype='pdf')
    except Exception as exc:
        logger.error('Failed to open PDF: %s', exc)
        return _empty_result([f'Failed to open PDF: {exc}'])

    native_count = 0
    ocr_count = 0

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        page_number = page_idx + 1

        # Try native text extraction first
        native_text = page.get_text('text').strip()

        if len(native_text) >= 50:
            # Native extraction — good enough
            pages.append(OCRPageResult(
                page_number=page_number,
                text=native_text,
                confidence=1.0,
                boxes=[],
                method='native',
            ))
            native_count += 1
            continue

        # Fall back to OCR — render page at 300 DPI
        if not _PADDLE_AVAILABLE or not _HELPERS_AVAILABLE:
            # No PaddleOCR — keep whatever native text we got (may be empty)
            pages.append(OCRPageResult(
                page_number=page_number,
                text=native_text,
                confidence=1.0 if native_text else 0.0,
                boxes=[],
                method='native',
            ))
            native_count += 1
            continue
        try:
            pixmap = page.get_pixmap(dpi=300)
            img_array = np.frombuffer(pixmap.samples, dtype=np.uint8).reshape(
                (pixmap.height, pixmap.width, pixmap.n),
            )
            # Convert RGBA to RGB if needed
            if pixmap.n == 4:
                img_array = img_array[:, :, :3]

            engine = _get_ocr_engine()
            raw_result = engine.ocr(img_array, cls=True)

            text, confidence, boxes = _parse_ocr_result(raw_result)

            pages.append(OCRPageResult(
                page_number=page_number,
                text=text,
                confidence=confidence,
                boxes=boxes,
                method='ocr',
            ))
            ocr_count += 1
        except Exception as exc:
            logger.warning('OCR failed on page %d: %s', page_number, exc)
            errors.append(f'OCR failed on page {page_number}: {exc}')
            pages.append(OCRPageResult(
                page_number=page_number,
                text='',
                confidence=0.0,
                boxes=[],
                method='ocr',
            ))
            ocr_count += 1

    doc.close()

    # Determine extraction method
    if native_count > 0 and ocr_count == 0:
        extraction_method = 'native_pdf'
    elif ocr_count > 0 and native_count == 0:
        extraction_method = 'ocr_pdf'
    else:
        extraction_method = 'mixed_pdf'

    # Compute average confidence
    total_conf = sum(p.confidence for p in pages)
    avg_confidence = total_conf / len(pages) if pages else 0.0

    # Combine full text
    full_text = '\n\n'.join(
        f'--- Page {p.page_number} ---\n\n{p.text}' for p in pages
    )

    return OCRDocumentResult(
        pages=pages,
        full_text=full_text,
        page_count=len(pages),
        average_confidence=avg_confidence,
        extraction_method=extraction_method,
        processing_time_ms=0.0,  # caller fills this in
        errors=errors,
    )


# ---------------------------------------------------------------------------
# Image extraction
# ---------------------------------------------------------------------------

def _extract_image(file_bytes: bytes) -> OCRDocumentResult:
    """Extract text from an image file using PaddleOCR."""
    errors: list[str] = []

    if not _PADDLE_AVAILABLE or not _HELPERS_AVAILABLE:
        return _empty_result(['PaddleOCR not available — image OCR requires paddleocr + numpy + Pillow'])

    try:
        img = Image.open(io.BytesIO(file_bytes))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        img_array = np.array(img)
    except Exception as exc:
        logger.error('Failed to open image: %s', exc)
        return _empty_result([f'Failed to open image: {exc}'])

    try:
        engine = _get_ocr_engine()
        raw_result = engine.ocr(img_array, cls=True)
        text, confidence, boxes = _parse_ocr_result(raw_result)
    except Exception as exc:
        logger.error('PaddleOCR failed on image: %s', exc)
        return _empty_result([f'OCR processing failed: {exc}'])

    page = OCRPageResult(
        page_number=1,
        text=text,
        confidence=confidence,
        boxes=boxes,
        method='ocr',
    )

    return OCRDocumentResult(
        pages=[page],
        full_text=text,
        page_count=1,
        average_confidence=confidence,
        extraction_method='ocr_image',
        processing_time_ms=0.0,  # caller fills this in
        errors=errors,
    )


# ---------------------------------------------------------------------------
# Public entry points
# ---------------------------------------------------------------------------

def extract_document(file_bytes: bytes, filename: str) -> OCRDocumentResult:
    """Synchronous document extraction entry point.

    Validates inputs, dispatches to the appropriate extractor, and wraps
    everything in a try/except so it never raises.
    """
    if not OCR_AVAILABLE:
        raise RuntimeError(
            'OCR dependencies are not installed. '
            'Install paddlepaddle, paddleocr, PyMuPDF, Pillow, and numpy.'
        )

    start = time.perf_counter()

    try:
        # Validate empty
        if not file_bytes:
            elapsed = (time.perf_counter() - start) * 1000
            return _empty_result(['Empty file'], processing_time_ms=elapsed)

        # Validate size
        if len(file_bytes) > _MAX_FILE_SIZE:
            elapsed = (time.perf_counter() - start) * 1000
            return _empty_result(['File too large'], processing_time_ms=elapsed)

        # Determine file type
        ext = os.path.splitext(filename)[1].lower()

        if ext in _PDF_EXTENSIONS:
            result = _extract_pdf(file_bytes)
        elif ext in _IMAGE_EXTENSIONS:
            result = _extract_image(file_bytes)
        else:
            elapsed = (time.perf_counter() - start) * 1000
            return _empty_result(
                [f'Unsupported file type: {ext}'],
                processing_time_ms=elapsed,
            )

        result.processing_time_ms = (time.perf_counter() - start) * 1000
        return result

    except Exception as exc:
        logger.error('Unexpected error in extract_document: %s', exc, exc_info=True)
        elapsed = (time.perf_counter() - start) * 1000
        return _empty_result([f'Unexpected error: {exc}'], processing_time_ms=elapsed)


async def async_extract_document(file_bytes: bytes, filename: str) -> OCRDocumentResult:
    """Async wrapper that runs extract_document in a thread."""
    return await asyncio.to_thread(extract_document, file_bytes, filename)
