#!/usr/bin/env python3
"""
OCR Inference Benchmark — Separated Phase Timing
=================================================
Measures each phase of the OCR pipeline independently:
  Phase 1: Module imports
  Phase 2: Model download (network / disk cache)
  Phase 3: Model initialization (PaddleOCR engine construction)
  Phase 4: Warmup (first inference — JIT compilation, cache population)
  Phase 5: Steady-state inference (averaged over N runs)

Usage:
    python benchmark_ocr.py
    python benchmark_ocr.py --runs 10        # more inference iterations
    python benchmark_ocr.py --skip-download   # assume models already cached
"""
from __future__ import annotations

import argparse
import io
import os
import sys
import time

# ---------------------------------------------------------------------------
# Phase 0: Pre-import environment (same config as backend/app/ocr.py)
# ---------------------------------------------------------------------------
os.environ['FLAGS_use_mkldnn'] = '0'

import numpy as np

# numpy 2.x compatibility shim for imgaug 0.4.0
if not hasattr(np, 'bool'):
    np.bool = np.bool_        # type: ignore[attr-defined]
if not hasattr(np, 'complex'):
    np.complex = np.complex128  # type: ignore[attr-defined]
if not hasattr(np, 'int'):
    np.int = np.int_          # type: ignore[attr-defined]
if not hasattr(np, 'float'):
    np.float = np.float64     # type: ignore[attr-defined]


def build_test_image() -> np.ndarray:
    """Build a synthetic medical report image (same as test fixtures)."""
    from PIL import Image, ImageDraw

    lines = [
        "METROPOLITAN MEDICAL CENTER",
        "Laboratory Report",
        "",
        "Patient: Jane A. Doe          DOB: 03/15/1978",
        "MRN: MED-2024-78432           Gender: Female",
        "Physician: Dr. Robert Chen    Collection Date: 01/15/2024",
        "",
        "COMPLETE BLOOD COUNT (CBC)",
        "WBC                  7.2       x10^3/uL   4.5-11.0",
        "RBC                  4.65      x10^6/uL   4.00-5.50",
        "Hemoglobin (Hgb)     13.8      g/dL       12.0-16.0",
        "Hematocrit (Hct)     41.2      %          36.0-46.0",
        "Platelets (PLT)      245       x10^3/uL   150-400",
        "",
        "BASIC METABOLIC PANEL (BMP)",
        "Glucose              98.5      mg/dL      70-100",
        "Creatinine           0.92      mg/dL      0.60-1.20",
        "Sodium               141       mEq/L      136-145",
        "Potassium            4.1       mEq/L      3.5-5.0",
        "",
        "HbA1c                6.4       %          4.0-5.6      HIGH",
        "Blood Pressure: 128/82 mmHg",
        "Medication: Metformin 500mg twice daily",
    ]

    img = Image.new("RGB", (800, 1200), "white")
    draw = ImageDraw.Draw(img)
    y = 20
    for line in lines:
        draw.text((20, y), line, fill="black")
        y += 16
    return np.array(img)


def phase(msg: str) -> None:
    """Print a phase header."""
    print(f"\n{'='*60}")
    print(f"  {msg}")
    print(f"{'='*60}")


def main() -> int:
    parser = argparse.ArgumentParser(description="OCR inference benchmark")
    parser.add_argument("--runs", type=int, default=5,
                        help="Number of steady-state inference runs (default: 5)")
    parser.add_argument("--skip-download", action="store_true",
                        help="Skip model download timing (assume cached)")
    args = parser.parse_args()

    import logging
    logging.disable(logging.WARNING)

    print("=" * 60)
    print("  OCR Inference Benchmark")
    print(f"  numpy={np.__version__}  runs={args.runs}")
    print("=" * 60)

    # -----------------------------------------------------------------------
    # Phase 1: Module imports
    # -----------------------------------------------------------------------
    phase("Phase 1: Module imports")
    t0 = time.perf_counter()
    from paddleocr import PaddleOCR
    from paddleocr.paddleocr import get_model_config, confirm_model_dir_url, BASE_DIR, parse_args
    from paddleocr.ppocr.utils.network import maybe_download
    t1 = time.perf_counter()
    import_time_ms = (t1 - t0) * 1000
    print(f"  Import time: {import_time_ms:,.1f} ms")

    # -----------------------------------------------------------------------
    # Phase 2: Model download (or cache verification)
    # -----------------------------------------------------------------------
    if not args.skip_download:
        phase("Phase 2: Model download / cache check")
        params = parse_args(mMain=False)
        params.__dict__.update(use_angle_cls=True, lang='en', show_log=False)

        det_model_config = get_model_config("OCR", params.ocr_version, "det", "en")
        params.det_model_dir, det_url = confirm_model_dir_url(
            params.det_model_dir, os.path.join(BASE_DIR, "whl", "det", "en"),
            det_model_config["url"],
        )
        rec_model_config = get_model_config("OCR", params.ocr_version, "rec", "en")
        params.rec_model_dir, rec_url = confirm_model_dir_url(
            params.rec_model_dir, os.path.join(BASE_DIR, "whl", "rec", "en"),
            rec_model_config["url"],
        )
        cls_model_config = get_model_config("OCR", params.ocr_version, "cls", "ch")
        params.cls_model_dir, cls_url = confirm_model_dir_url(
            params.cls_model_dir, os.path.join(BASE_DIR, "whl", "cls"),
            cls_model_config["url"],
        )

        t0 = time.perf_counter()
        maybe_download(params.det_model_dir, det_url)
        maybe_download(params.rec_model_dir, rec_url)
        maybe_download(params.cls_model_dir, cls_url)
        t1 = time.perf_counter()
        download_time_ms = (t1 - t0) * 1000
        print(f"  Download/cache time: {download_time_ms:,.1f} ms")
    else:
        download_time_ms = 0.0
        print("\n  [skipped] — assuming models are cached")

    # -----------------------------------------------------------------------
    # Phase 3: Model initialization
    # -----------------------------------------------------------------------
    phase("Phase 3: Model initialization (PaddleOCR constructor)")
    t0 = time.perf_counter()
    ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False,
                     enable_mkldnn=False)
    t1 = time.perf_counter()
    init_time_ms = (t1 - t0) * 1000
    print(f"  Initialization time: {init_time_ms:,.1f} ms")

    # -----------------------------------------------------------------------
    # Build test image
    # -----------------------------------------------------------------------
    test_image = build_test_image()
    print(f"\n  Test image shape: {test_image.shape}")

    # -----------------------------------------------------------------------
    # Phase 4: Warmup (first inference)
    # -----------------------------------------------------------------------
    phase("Phase 4: Warmup (first inference)")
    t0 = time.perf_counter()
    warmup_result = ocr.ocr(test_image, cls=True)
    t1 = time.perf_counter()
    warmup_time_ms = (t1 - t0) * 1000
    print(f"  Warmup time: {warmup_time_ms:,.1f} ms")

    # Parse warmup result for validation
    if warmup_result and warmup_result[0]:
        warmup_boxes = len(warmup_result[0])
        print(f"  Boxes detected: {warmup_boxes}")
    else:
        print("  WARNING: warmup produced no output")

    # -----------------------------------------------------------------------
    # Phase 5: Steady-state inference
    # -----------------------------------------------------------------------
    phase(f"Phase 5: Steady-state inference ({args.runs} runs)")
    inference_times_ms: list[float] = []

    for i in range(args.runs):
        t0 = time.perf_counter()
        result = ocr.ocr(test_image, cls=True)
        t1 = time.perf_counter()
        elapsed_ms = (t1 - t0) * 1000
        inference_times_ms.append(elapsed_ms)
        print(f"  Run {i + 1:>2d}: {elapsed_ms:>10,.1f} ms")

    avg_inference_ms = sum(inference_times_ms) / len(inference_times_ms)
    min_inference_ms = min(inference_times_ms)
    max_inference_ms = max(inference_times_ms)
    median_inference_ms = sorted(inference_times_ms)[len(inference_times_ms) // 2]

    # Validate last result
    if result and result[0]:
        boxes = result[0]
        avg_conf = sum(float(item[1][1]) for item in boxes) / len(boxes)
        texts = [item[1][0] for item in boxes]
        full_text = "\n".join(texts)
        # Spot-check medical values
        spot_checks = ["7.2", "13.8", "98.5", "6.4", "128/82"]
        found = [v for v in spot_checks if v in full_text]
        print(f"\n  Boxes: {len(boxes)}  Avg confidence: {avg_conf:.4f}")
        print(f"  Medical value spot-check: {len(found)}/{len(spot_checks)} "
              f"({', '.join(found)})")

    # -----------------------------------------------------------------------
    # Summary
    # -----------------------------------------------------------------------
    phase("SUMMARY")
    print(f"  Phase 1 — Imports:          {import_time_ms:>12,.1f} ms")
    if not args.skip_download:
        print(f"  Phase 2 — Model download:   {download_time_ms:>12,.1f} ms")
    print(f"  Phase 3 — Initialization:   {init_time_ms:>12,.1f} ms")
    print(f"  Phase 4 — Warmup:           {warmup_time_ms:>12,.1f} ms")
    print(f"  Phase 5 — Inference (avg):  {avg_inference_ms:>12,.1f} ms")
    print(f"  Phase 5 — Inference (min):  {min_inference_ms:>12,.1f} ms")
    print(f"  Phase 5 — Inference (max):  {max_inference_ms:>12,.1f} ms")
    print(f"  Phase 5 — Inference (med):  {median_inference_ms:>12,.1f} ms")
    print(f"  {'─' * 56}")
    total = import_time_ms + download_time_ms + init_time_ms + warmup_time_ms + avg_inference_ms
    print(f"  Total (cold start + 1 run): {total:>12,.1f} ms")
    print()
    print(f"  >>> Measured steady-state inference time: "
          f"{avg_inference_ms:,.1f} ms (avg over {args.runs} runs) <<<")
    print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
