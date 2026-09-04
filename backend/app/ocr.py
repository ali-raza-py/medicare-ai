from __future__ import annotations

import asyncio
import io
import logging
import os
import gc
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

_PADDLEOCR_ENABLED = os.getenv('MEDICARE_PADDLEOCR_ENABLED', 'true').lower() not in {
    '0', 'false', 'no', 'off',
}

try:
    import pymupdf as fitz
    _PYMUPDF_AVAILABLE = True
except ImportError:
    _PYMUPDF_AVAILABLE = False

# Populated when the PaddleOCR import fails; kept next to the import for
# visibility. Surfaced via ocr_status().
_PADDLE_IMPORT_ERROR: str | None = None

try:
    if not _PADDLEOCR_ENABLED:
        raise ImportError('PaddleOCR disabled by MEDICARE_PADDLEOCR_ENABLED')
    from paddleocr import PaddleOCR
    import paddleocr as _paddleocr_module
    _PADDLE_AVAILABLE = True
    # Detect major version — PaddleOCR 3.x has a completely different API.
    _paddle_version = (
        getattr(_paddleocr_module, '__version__', None)
        or getattr(PaddleOCR, '__version__', None)
        or ''
    )
    try:
        _PADDLE_V3 = int(_paddle_version.split('.')[0]) >= 3
    except (ValueError, IndexError):
        # Fallback: check if predict() method exists (3.x) vs only ocr() (2.x)
        _PADDLE_V3 = hasattr(PaddleOCR, 'predict')
except Exception as _paddle_import_exc:
    # Missing system libraries (libgomp.so.1, libGL.so.1, ...) on slim Linux
    # images surface as ImportError/OSError HERE, not as pip failures at
    # build time. Catch broadly so a broken paddle install only disables
    # image OCR instead of crashing the whole backend, and record the reason
    # so /api/health and the startup log show exactly what is missing.
    _PADDLE_IMPORT_ERROR = f'{type(_paddle_import_exc).__name__}: {_paddle_import_exc}'
    logger.warning('PaddleOCR import failed (image OCR disabled): %s', _PADDLE_IMPORT_ERROR)
    PaddleOCR = None  # type: ignore[assignment,misc]
    _PADDLE_AVAILABLE = False
    _PADDLE_V3 = False
    _paddle_version = ''

try:
    import numpy as np
    from PIL import Image
    _HELPERS_AVAILABLE = True
except ImportError:
    _HELPERS_AVAILABLE = False

# OCR is available when any real extraction backend is present: PyMuPDF for
# native PDF text, or PaddleOCR for images and scanned PDF pages.
OCR_AVAILABLE = _PYMUPDF_AVAILABLE or _PADDLE_AVAILABLE


def ocr_status() -> dict:
    """Diagnostics for /api/health: which OCR backends are importable and,
    when PaddleOCR is not, why its import failed."""
    return {
        'paddle_enabled': _PADDLEOCR_ENABLED,
        'paddle_available': _PADDLE_AVAILABLE,
        'paddleocr_version': _paddle_version or None,
        'paddle_import_error': _PADDLE_IMPORT_ERROR,
        'pymupdf_available': _PYMUPDF_AVAILABLE,
    }

_MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

_PDF_EXTENSIONS = {'.pdf'}
_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}

# ---------------------------------------------------------------------------
# Lazy PaddleOCR singleton
# ---------------------------------------------------------------------------

_ocr_engine: 'PaddleOCR | None' = None
_ocr_lock = threading.Lock()
_ocr_job_lock = threading.Lock()


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
        logger.info('Initializing PaddleOCR engine (first call, v%s)',
                    _paddle_version if _PADDLE_AVAILABLE else '?')
        # Suppress noisy PaddleOCR / PaddlePaddle loggers.
        logging.getLogger('ppocr').setLevel(logging.WARNING)
        logging.getLogger('paddle').setLevel(logging.WARNING)
        init_kwargs: dict = dict(
            use_angle_cls=True,
            lang='en',
            # OneDNN is disabled via env var at module top; passing
            # enable_mkldnn=False ensures paddleocr also calls
            # config.disable_onednn() on the inference config.
            enable_mkldnn=False,
        )
        # show_log= was removed in PaddleOCR >= 3.0
        if not _PADDLE_V3:
            init_kwargs['show_log'] = False
        _ocr_engine = PaddleOCR(**init_kwargs)
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


def _parse_ocr_result(raw_result) -> tuple[str, float, list[OCRBoxResult]]:
    """Parse a single-image PaddleOCR result into text, confidence, and boxes.

    Handles both formats:
      - PaddleOCR 2.x: ``[[[bbox, (text, score)], ...]]``
      - PaddleOCR 3.x: dict-like with ``rec_texts``, ``rec_scores``, ``dt_polys``
    """
    if raw_result is None:
        return '', 0.0, []

    # Materialise generator if needed.
    if not isinstance(raw_result, (list, dict)):
        try:
            items = list(raw_result)
        except TypeError:
            return '', 0.0, []
    else:
        items = raw_result if isinstance(raw_result, list) else [raw_result]

    if not items:
        return '', 0.0, []

    res = items[0]  # single-image result

    # ---- PaddleOCR 3.x dict-like format --------------------------------
    rec_texts = (
        res.get('rec_texts', [])  if hasattr(res, 'get')
        else getattr(res, 'rec_texts', [])
    )
    if rec_texts:
        rec_scores = (
            res.get('rec_scores', []) if hasattr(res, 'get')
            else getattr(res, 'rec_scores', [])
        )
        dt_polys = (
            res.get('dt_polys', []) if hasattr(res, 'get')
            else getattr(res, 'dt_polys', [])
        )
        boxes: list[OCRBoxResult] = []
        for idx, text in enumerate(rec_texts):
            if not text or not str(text).strip():
                continue
            score = float(rec_scores[idx]) if idx < len(rec_scores) else 0.0
            poly  = dt_polys[idx] if idx < len(dt_polys) else []
            try:
                bbox_clean = [[float(p[0]), float(p[1])] for p in poly]
            except (TypeError, IndexError):
                bbox_clean = []
            boxes.append(OCRBoxResult(text=str(text), confidence=score, bbox=bbox_clean))

        if boxes and boxes[0].bbox:
            boxes.sort(key=lambda b: (min(p[1] for p in b.bbox), min(p[0] for p in b.bbox)))
        full_text = '\n'.join(box.text for box in boxes)
        avg_conf  = sum(box.confidence for box in boxes) / len(boxes) if boxes else 0.0
        return full_text, avg_conf, boxes

    # ---- PaddleOCR 2.x legacy format -----------------------------------
    # [[bbox, (text, score)], ...] per image
    page_results = (
        res if isinstance(res, list) else
        (res[0] if isinstance(res[0], list) and len(res) == 1 else res)
    ) if isinstance(res, list) else []
    if not page_results:
        return '', 0.0, []

    boxes = []
    for item in page_results:
        try:
            bbox = item[0]
            rec  = item[1]
            text = rec[0]
            score = float(rec[1])
            bbox_clean = [[float(p[0]), float(p[1])] for p in bbox]
            boxes.append(OCRBoxResult(text=str(text), confidence=score, bbox=bbox_clean))
        except (TypeError, IndexError):
            continue

    if boxes and boxes[0].bbox:
        boxes.sort(key=lambda b: (min(p[1] for p in b.bbox), min(p[0] for p in b.bbox)))
    full_text = '\n'.join(box.text for box in boxes)
    avg_conf  = sum(box.confidence for box in boxes) / len(boxes) if boxes else 0.0
    return full_text, avg_conf, boxes


# ---------------------------------------------------------------------------
# PDF extraction
# ---------------------------------------------------------------------------

def _extract_pdf(source: bytes | str) -> OCRDocumentResult:
    """Extract text from a PDF: native text first, then PaddleOCR for scans."""
    errors: list[str] = []
    pages: list[OCRPageResult] = []

    try:
        doc = fitz.open(stream=source, filetype='pdf') if isinstance(source, bytes) else fitz.open(source)
    except Exception as exc:
        logger.error('Failed to open PDF: %s', exc)
        return _empty_result([f'Failed to open PDF: {exc}'])

    native_count = 0
    ocr_count = 0

    try:
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

        # PaddleOCR attempt — render page at 300 DPI
            if _PADDLE_AVAILABLE and _HELPERS_AVAILABLE:
                pixmap = None
                img_array = None
                try:
                    # Keep the source dimensions bounded; very large scans can
                    # otherwise create multi-hundred-megabyte NumPy buffers.
                    matrix = fitz.Matrix(2.0, 2.0)
                    rect = page.rect
                    max_dimension = max(rect.width * 2.0, rect.height * 2.0)
                    if max_dimension > 1600:
                        scale = 1600 / max_dimension
                        matrix = fitz.Matrix(2.0 * scale, 2.0 * scale)
                    pixmap = page.get_pixmap(matrix=matrix, alpha=False)
                    img_array = np.frombuffer(pixmap.samples, dtype=np.uint8).reshape(
                        (pixmap.height, pixmap.width, pixmap.n),
                    )
                # Convert RGBA to RGB if needed
                    if pixmap.n == 4:
                        img_array = img_array[:, :, :3]

                    engine = _get_ocr_engine()
                    if _PADDLE_V3:
                        raw_result = list(engine.predict(img_array))
                    else:
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
                    continue
                except Exception as exc:
                    logger.warning('PaddleOCR failed on page %d: %s', page_number, type(exc).__name__)
                    errors.append(f'PaddleOCR failed on page {page_number}: {type(exc).__name__}')
                finally:
                    del img_array, pixmap
                    gc.collect()

        # No backend produced text — keep whatever native text we got (may be empty)
            pages.append(OCRPageResult(
            page_number=page_number,
            text=native_text,
            confidence=1.0 if native_text else 0.0,
            boxes=[],
            method='native',
        ))
            native_count += 1
            del page
    finally:
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

def _extract_image(source: bytes | str, filename: str) -> OCRDocumentResult:
    """Extract text from an image file using PaddleOCR."""
    errors: list[str] = []

    # PaddleOCR path (local / Render deployments)
    if _PADDLE_AVAILABLE and _HELPERS_AVAILABLE:
        try:
            img = Image.open(io.BytesIO(source)) if isinstance(source, bytes) else Image.open(source)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
            img_array = np.array(img)
        except Exception as exc:
            logger.error('Failed to open image: %s', exc)
            errors.append(f'Failed to open image: {exc}')
        else:
            try:
                engine = _get_ocr_engine()
                if _PADDLE_V3:
                    raw_result = list(engine.predict(img_array))
                else:
                    raw_result = engine.ocr(img_array, cls=True)
                text, confidence, boxes = _parse_ocr_result(raw_result)
                if text.strip():
                    result = OCRDocumentResult(
                        pages=[OCRPageResult(
                            page_number=1,
                            text=text,
                            confidence=confidence,
                            boxes=boxes,
                            method='ocr',
                        )],
                        full_text=text,
                        page_count=1,
                        average_confidence=confidence,
                        extraction_method='ocr_image',
                        processing_time_ms=0.0,  # caller fills this in
                        errors=errors,
                    )
                    del raw_result, img_array, img
                    gc.collect()
                    return result
                # Paddle found no text — an honest failure, not a fake success.
                errors.append('PaddleOCR returned no text for this image')
            except Exception as exc:
                logger.error('PaddleOCR failed on image: %s', type(exc).__name__)
                errors.append(f'PaddleOCR failed: {type(exc).__name__}')
            finally:
                if 'img_array' in locals():
                    del img_array
                if 'img' in locals():
                    del img
                gc.collect()
    elif not _PADDLE_AVAILABLE:
        errors.append('PaddleOCR not available in this environment')

    return _empty_result(errors or ['No OCR backend could extract text from this image'])


# ---------------------------------------------------------------------------
# Public entry points
# ---------------------------------------------------------------------------

def extract_document(file_bytes: bytes | None, filename: str, file_path: str | None = None) -> OCRDocumentResult:
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
        if not file_bytes and not file_path:
            elapsed = (time.perf_counter() - start) * 1000
            return _empty_result(['Empty file'], processing_time_ms=elapsed)

        # Validate size
        if file_bytes is not None and len(file_bytes) > _MAX_FILE_SIZE:
            elapsed = (time.perf_counter() - start) * 1000
            return _empty_result(['File too large'], processing_time_ms=elapsed)

        # Determine file type
        ext = os.path.splitext(filename)[1].lower()

        if ext in _PDF_EXTENSIONS:
            if file_path:
                source: bytes | str = file_path
            elif file_bytes is not None:
                source = file_bytes
            else:
                raise ValueError('A temporary file path is required for PDF OCR')
            result = _extract_pdf(source)
        elif ext in _IMAGE_EXTENSIONS:
            if file_path:
                source = file_path
            elif file_bytes is not None:
                source = file_bytes
            else:
                raise ValueError('A temporary file path is required for image OCR')
            result = _extract_image(source, filename)
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
