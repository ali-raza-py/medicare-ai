"""Post-cleanup verification: run REAL PaddleOCR on the real test images.

Prints a text sample and page stats — proves OCR still works after
removing the Groq vision fallback. No values are hardcoded here.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, ".")

from backend.app.ocr import extract_document  # noqa: E402

for name in ("test_medical_report.png", "test_medical_report.webp"):
    path = Path(name)
    if not path.exists():
        print(f"SKIP {name}: file not found")
        continue
    data = path.read_bytes()
    start = time.perf_counter()
    result = extract_document(data, name)
    elapsed = time.perf_counter() - start
    print(f"== {name} ({len(data):,} bytes) ==")
    print(f"   method={result.extraction_method} pages={result.page_count} "
          f"conf={result.average_confidence:.3f} time={elapsed:.1f}s errors={result.errors}")
    sample = result.full_text[:400].replace("\n", " | ")
    print(f"   text sample: {sample}")
    print()
