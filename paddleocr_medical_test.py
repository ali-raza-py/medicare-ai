#!/usr/bin/env python3
"""
Comprehensive PaddleOCR Medical Image Test Suite
=================================================
Tests real PaddleOCR on synthetic medical report images with detailed accuracy reporting.

Test Coverage:
- Clean synthetic medical report images
- Realistic scanned/photographed medical report images (with noise, blur, rotation, shadows)
- PNG, JPG, JPEG formats
- Medical numbers, decimals, dates, units, test names, reference ranges, abbreviations
"""

import os
os.environ['FLAGS_use_mkldnn'] = '0'

import sys
import io
import time
import random
import math
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional

import numpy as np

# numpy 2.x compatibility shim for imgaug 0.4.0 (transitive dep of paddleocr)
if not hasattr(np, 'bool'):
    np.bool = np.bool_        # type: ignore[attr-defined]
if not hasattr(np, 'complex'):
    np.complex = np.complex128  # type: ignore[attr-defined]
if not hasattr(np, 'int'):
    np.int = np.int_          # type: ignore[attr-defined]
if not hasattr(np, 'float'):
    np.float = np.float64     # type: ignore[attr-defined]

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

# Suppress excessive logging
import logging
logging.disable(logging.WARNING)

from paddleocr import PaddleOCR


# =============================================================================
# TEST DATA: Medical Report Content
# =============================================================================

MEDICAL_REPORT_LINES = [
    "METROPOLITAN MEDICAL CENTER",
    "Laboratory Report",
    "",
    "Patient: Jane A. Doe          DOB: 03/15/1978",
    "MRN: MED-2024-78432           Gender: Female",
    "Physician: Dr. Robert Chen    Collection Date: 01/15/2024",
    "                               Report Date: 01/16/2024",
    "",
    "COMPLETE BLOOD COUNT (CBC)",
    "Test Name            Result    Units      Reference Range",
    "WBC                  7.2       x10^3/uL   4.5-11.0",
    "RBC                  4.65      x10^6/uL   4.00-5.50",
    "Hemoglobin (Hgb)     13.8      g/dL       12.0-16.0",
    "Hematocrit (Hct)     41.2      %          36.0-46.0",
    "Platelets (PLT)      245       x10^3/uL   150-400",
    "MCV                  88.6      fL         80.0-100.0",
    "MCH                  29.7      pg         27.0-33.0",
    "MCHC                 33.5      g/dL       32.0-36.0",
    "",
    "BASIC METABOLIC PANEL (BMP)",
    "Test Name            Result    Units      Reference Range",
    "Glucose              98.5      mg/dL      70-100",
    "BUN                  14        mg/dL      7-20",
    "Creatinine           0.92      mg/dL      0.60-1.20",
    "Sodium               141       mEq/L      136-145",
    "Potassium            4.1       mEq/L      3.5-5.0",
    "Chloride             103       mEq/L      98-106",
    "CO2                  24        mEq/L      23-29",
    "Calcium              9.4       mg/dL      8.5-10.5",
    "",
    "ADDITIONAL TESTS",
    "HbA1c                6.4       %          4.0-5.6      HIGH",
    "TSH                  2.15      mIU/L      0.40-4.00",
    "Total Cholesterol    192       mg/dL      <200",
    "LDL Cholesterol      118       mg/dL      <100         HIGH",
    "HDL Cholesterol      54        mg/dL      >40",
    "Triglycerides        156       mg/dL      <150         HIGH",
    "",
    "Medication: Metformin 500mg twice daily",
    "Blood Pressure: 128/82 mmHg",
    "SpO2: 98%",
    "",
    "Notes: Patient shows well-controlled diabetes with slightly elevated",
    "HbA1c. Lipid panel shows borderline values. Recommend dietary",
    "modifications and follow-up in 3 months.",
    "",
    "Electronically signed by: Dr. Robert Chen, MD",
    "Report ID: LAB-2024-001587",
]

# Expected values for validation
EXPECTED_MEDICAL_VALUES = {
    "numbers_with_decimals": ["7.2", "4.65", "13.8", "41.2", "88.6", "29.7", "33.5", 
                              "98.5", "0.92", "4.1", "9.4", "6.4", "2.15"],
    "integers": ["245", "14", "141", "103", "24", "192", "118", "54", "156", "98"],
    "blood_pressure": ["128/82"],
    "dates": ["03/15/1978", "01/15/2024", "01/16/2024"],
    "units": ["x10^3/uL", "x10^6/uL", "g/dL", "%", "fL", "pg", "mg/dL", "mEq/L", "mIU/L", "mmHg"],
    "test_names": ["WBC", "RBC", "Hemoglobin", "Hgb", "Hematocrit", "Hct", "Platelets", "PLT",
                   "MCV", "MCH", "MCHC", "Glucose", "BUN", "Creatinine", "Sodium", "Potassium",
                   "Chloride", "CO2", "Calcium", "HbA1c", "TSH", "Cholesterol", "LDL", "HDL", 
                   "Triglycerides"],
    "abbreviations": ["CBC", "BMP", "MRN", "DOB", "SpO2", "MD"],
    "reference_ranges": ["4.5-11.0", "4.00-5.50", "12.0-16.0", "36.0-46.0", "150-400",
                         "80.0-100.0", "27.0-33.0", "32.0-36.0", "70-100", "7-20",
                         "0.60-1.20", "136-145", "3.5-5.0", "98-106", "23-29", "8.5-10.5",
                         "4.0-5.6", "0.40-4.00"],
    "medications": ["Metformin", "500mg"],
    "identifiers": ["MED-2024-78432", "LAB-2024-001587"],
}


# =============================================================================
# IMAGE GENERATION UTILITIES
# =============================================================================

def generate_clean_medical_image(width: int = 850, height: int = 1300) -> Image.Image:
    """Generate a clean synthetic medical report image."""
    img = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(img)
    
    # Try to use a monospace font for better alignment, fallback to default
    try:
        font = ImageFont.truetype("arial.ttf", 14)
        title_font = ImageFont.truetype("arial.ttf", 18)
    except:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 14)
            title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
        except:
            font = ImageFont.load_default()
            title_font = font
    
    y = 20
    for i, line in enumerate(MEDICAL_REPORT_LINES):
        # Use title font for headers
        if i < 2 or (line and line.isupper() and len(line) > 10):
            current_font = title_font
        else:
            current_font = font
        
        draw.text((25, y), line, fill="black", font=current_font)
        y += 18 if current_font == title_font else 16
    
    return img


def add_scan_artifacts(img: Image.Image, severity: str = "medium") -> Image.Image:
    """
    Add realistic scan/photo artifacts to simulate real-world conditions.
    
    severity: "light", "medium", "heavy"
    """
    img_array = np.array(img)
    
    # Severity multipliers
    sev_mult = {"light": 0.3, "medium": 0.6, "heavy": 1.0}[severity]
    
    # 1. Add Gaussian noise
    noise_std = int(15 * sev_mult)
    noise = np.random.normal(0, noise_std, img_array.shape).astype(np.int16)
    img_array = np.clip(img_array.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    # 2. Slight blur (camera focus issues)
    img = Image.fromarray(img_array)
    blur_radius = 0.5 * sev_mult
    if blur_radius > 0:
        img = img.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    
    # 3. Brightness/contrast variation (lighting conditions)
    brightness_factor = 1.0 + random.uniform(-0.15, 0.15) * sev_mult
    contrast_factor = 1.0 + random.uniform(-0.2, 0.1) * sev_mult
    
    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(brightness_factor)
    
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(contrast_factor)
    
    # 4. Slight rotation (paper not perfectly aligned)
    rotation_angle = random.uniform(-2.5, 2.5) * sev_mult
    if abs(rotation_angle) > 0.1:
        img = img.rotate(rotation_angle, resample=Image.BICUBIC, expand=False, fillcolor="white")
    
    # 5. Add shadow/gradient effect (uneven lighting)
    if sev_mult > 0.3:
        img_array = np.array(img)
        h, w = img_array.shape[:2]
        
        # Create gradient shadow
        gradient = np.zeros((h, w), dtype=np.float32)
        for i in range(h):
            gradient[i, :] = 1.0 - (0.15 * sev_mult * (i / h))
        
        for c in range(3):
            img_array[:, :, c] = np.clip(img_array[:, :, c] * gradient, 0, 255).astype(np.uint8)
        
        img = Image.fromarray(img_array)
    
    # 6. JPEG compression artifacts (for JPG formats)
    # This will be applied during save
    
    return img


def save_image_with_format(img: Image.Image, format: str, quality: int = 85) -> bytes:
    """Save image to bytes in specified format."""
    buf = io.BytesIO()
    
    if format.upper() in ["JPG", "JPEG"]:
        img.save(buf, format="JPEG", quality=quality)
    elif format.upper() == "PNG":
        img.save(buf, format="PNG")
    else:
        raise ValueError(f"Unsupported format: {format}")
    
    return buf.getvalue()


# =============================================================================
# OCR RESULT PARSER
# =============================================================================

def parse_paddle_ocr_result(raw_result) -> Tuple[str, float, List[Dict]]:
    """Parse PaddleOCR result into structured format."""
    boxes = []
    
    if not raw_result:
        return "", 0.0, []
    
    # Handle PaddleOCR 3.x format
    page_results = raw_result[0] if isinstance(raw_result[0], list) and len(raw_result) == 1 else raw_result
    if page_results is None:
        return "", 0.0, []
    
    for item in page_results:
        bbox = item[0]
        rec = item[1]
        text = rec[0]
        confidence = float(rec[1])
        
        boxes.append({
            "text": text,
            "confidence": confidence,
            "bbox": [[float(p[0]), float(p[1])] for p in bbox]
        })
    
    # Sort by vertical position for reading order
    boxes.sort(key=lambda b: (min(p[1] for p in b["bbox"]), min(p[0] for p in b["bbox"])))
    
    full_text = "\n".join(box["text"] for box in boxes)
    avg_conf = sum(box["confidence"] for box in boxes) / len(boxes) if boxes else 0.0
    
    return full_text, avg_conf, boxes


def validate_ocr_output(full_text: str, boxes: List[Dict]) -> Dict:
    """Validate OCR output against expected medical values."""
    results = {
        "total_expected": 0,
        "total_found": 0,
        "categories": {}
    }
    
    for category, values in EXPECTED_MEDICAL_VALUES.items():
        found = []
        missing = []
        
        for value in values:
            results["total_expected"] += 1
            if value in full_text:
                found.append(value)
                results["total_found"] += 1
            else:
                missing.append(value)
        
        results["categories"][category] = {
            "expected": len(values),
            "found": len(found),
            "missing": missing,
            "accuracy": len(found) / len(values) if values else 1.0
        }
    
    results["overall_accuracy"] = results["total_found"] / results["total_expected"] if results["total_expected"] > 0 else 0.0
    
    return results


# =============================================================================
# TEST CASES
# =============================================================================

@dataclass
class TestResult:
    test_name: str
    image_format: str
    image_type: str
    processing_time_ms: float
    avg_confidence: float
    num_text_boxes: int
    full_text: str
    validation_results: Dict
    errors: List[str] = field(default_factory=list)
    
    @property
    def passed(self) -> bool:
        # Pass if overall accuracy >= 60% and no critical errors
        return self.validation_results["overall_accuracy"] >= 0.60 and len(self.errors) == 0


def run_ocr_test(ocr_engine, image_bytes: bytes, test_name: str, 
                 image_format: str, image_type: str) -> TestResult:
    """Run a single OCR test and return results."""
    errors = []
    
    try:
        # Load image
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode != "RGB":
            img = img.convert("RGB")
        img_array = np.array(img)
        
        # Run OCR
        start_time = time.perf_counter()
        raw_result = ocr_engine.ocr(img_array, cls=True)
        processing_time = (time.perf_counter() - start_time) * 1000
        
        # Parse results
        full_text, avg_conf, boxes = parse_paddle_ocr_result(raw_result)
        
        if not full_text.strip():
            errors.append("OCR returned empty text")
        
        # Validate output
        validation = validate_ocr_output(full_text, boxes)
        
        return TestResult(
            test_name=test_name,
            image_format=image_format,
            image_type=image_type,
            processing_time_ms=processing_time,
            avg_confidence=avg_conf,
            num_text_boxes=len(boxes),
            full_text=full_text,
            validation_results=validation,
            errors=errors
        )
        
    except Exception as e:
        return TestResult(
            test_name=test_name,
            image_format=image_format,
            image_type=image_type,
            processing_time_ms=0,
            avg_confidence=0,
            num_text_boxes=0,
            full_text="",
            validation_results={"total_expected": 0, "total_found": 0, "categories": {}, "overall_accuracy": 0},
            errors=[f"Exception: {str(e)}"]
        )


# =============================================================================
# MAIN TEST SUITE
# =============================================================================

def main():
    print("=" * 80)
    print("PaddleOCR Medical Image Test Suite")
    print("=" * 80)
    print()
    
    # Initialize PaddleOCR
    print("Initializing PaddleOCR engine...")
    ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
    print("✓ PaddleOCR initialized successfully")
    print()
    
    all_results: List[TestResult] = []
    
    # -------------------------------------------------------------------------
    # TEST SET 1: Clean Synthetic Images
    # -------------------------------------------------------------------------
    print("=" * 80)
    print("TEST SET 1: Clean Synthetic Medical Report Images")
    print("=" * 80)
    print()
    
    clean_img = generate_clean_medical_image()
    
    for fmt in ["PNG", "JPG", "JPEG"]:
        test_name = f"Clean Synthetic ({fmt})"
        print(f"Running: {test_name}...")
        
        img_bytes = save_image_with_format(clean_img, fmt, quality=95)
        result = run_ocr_test(ocr, img_bytes, test_name, fmt, "clean")
        all_results.append(result)
        
        print(f"  Status: {'✓ PASS' if result.passed else '✗ FAIL'}")
        print(f"  Processing Time: {result.processing_time_ms:.1f} ms")
        print(f"  Avg Confidence: {result.avg_confidence:.4f}")
        print(f"  Text Boxes Found: {result.num_text_boxes}")
        print(f"  Overall Accuracy: {result.validation_results['overall_accuracy']:.1%}")
        print()
    
    # -------------------------------------------------------------------------
    # TEST SET 2: Realistic Scanned Images (with artifacts)
    # -------------------------------------------------------------------------
    print("=" * 80)
    print("TEST SET 2: Realistic Scanned/Photographed Medical Images")
    print("=" * 80)
    print()
    
    for severity in ["light", "medium", "heavy"]:
        print(f"Artifact Severity: {severity.upper()}")
        print("-" * 40)
        
        scanned_img = generate_clean_medical_image()
        scanned_img = add_scan_artifacts(scanned_img, severity=severity)
        
        for fmt in ["PNG", "JPG"]:
            test_name = f"Scanned - {severity.capitalize()} Artifacts ({fmt})"
            print(f"  Running: {test_name}...")
            
            # Lower quality for JPEG to simulate real scans
            quality = 90 if severity == "light" else 75 if severity == "medium" else 60
            img_bytes = save_image_with_format(scanned_img, fmt, quality=quality)
            result = run_ocr_test(ocr, img_bytes, test_name, fmt, f"scanned_{severity}")
            all_results.append(result)
            
            print(f"    Status: {'✓ PASS' if result.passed else '✗ FAIL'}")
            print(f"    Processing Time: {result.processing_time_ms:.1f} ms")
            print(f"    Avg Confidence: {result.avg_confidence:.4f}")
            print(f"    Text Boxes Found: {result.num_text_boxes}")
            print(f"    Overall Accuracy: {result.validation_results['overall_accuracy']:.1%}")
            print()
    
    # -------------------------------------------------------------------------
    # DETAILED ACCURACY ANALYSIS
    # -------------------------------------------------------------------------
    print("=" * 80)
    print("DETAILED ACCURACY ANALYSIS")
    print("=" * 80)
    print()
    
    # Use the clean PNG result for detailed analysis
    clean_png_result = next((r for r in all_results if r.test_name == "Clean Synthetic (PNG)"), None)
    
    if clean_png_result:
        print("Analysis based on: Clean Synthetic (PNG)")
        print("-" * 80)
        print()
        
        for category, data in clean_png_result.validation_results["categories"].items():
            print(f"{category.upper().replace('_', ' ')}:")
            print(f"  Expected: {data['expected']}")
            print(f"  Found: {data['found']}")
            print(f"  Accuracy: {data['accuracy']:.1%}")
            
            if data["missing"]:
                print(f"  Missing values:")
                for val in data["missing"][:10]:  # Show first 10
                    print(f"    - {val}")
                if len(data["missing"]) > 10:
                    print(f"    ... and {len(data['missing']) - 10} more")
            print()
    
    # -------------------------------------------------------------------------
    # CRITICAL MEDICAL ERRORS ANALYSIS
    # -------------------------------------------------------------------------
    print("=" * 80)
    print("CRITICAL MEDICAL FIELD RECOGNITION ISSUES")
    print("=" * 80)
    print()
    
    critical_issues = []
    
    # Check each test result for critical medical values
    critical_values = ["6.4", "98.5", "128/82", "HbA1c", "Glucose", "Metformin"]
    
    for result in all_results:
        if result.errors:
            continue
        
        missing_critical = [v for v in critical_values if v not in result.full_text]
        
        if missing_critical:
            critical_issues.append({
                "test": result.test_name,
                "missing": missing_critical
            })
    
    if critical_issues:
        print("Tests with missing CRITICAL medical values:")
        print()
        for issue in critical_issues:
            print(f"  Test: {issue['test']}")
            print(f"  Missing critical values: {', '.join(issue['missing'])}")
            print()
    else:
        print("✓ All critical medical values detected across all tests")
        print()
    
    # -------------------------------------------------------------------------
    # FINAL SUMMARY
    # -------------------------------------------------------------------------
    print("=" * 80)
    print("FINAL TEST SUMMARY")
    print("=" * 80)
    print()
    
    total_tests = len(all_results)
    passed_tests = sum(1 for r in all_results if r.passed)
    failed_tests = total_tests - passed_tests
    
    print(f"Total Tests Executed: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_tests}")
    print(f"Pass Rate: {passed_tests/total_tests:.1%}")
    print()
    
    # Performance summary
    avg_processing_time = sum(r.processing_time_ms for r in all_results) / total_tests
    avg_confidence = sum(r.avg_confidence for r in all_results if r.avg_confidence > 0) / max(1, sum(1 for r in all_results if r.avg_confidence > 0))
    avg_accuracy = sum(r.validation_results["overall_accuracy"] for r in all_results) / total_tests
    
    print(f"Average Processing Time: {avg_processing_time:.1f} ms")
    print(f"Average OCR Confidence: {avg_confidence:.4f}")
    print(f"Average Medical Value Accuracy: {avg_accuracy:.1%}")
    print()
    
    # Detailed results table
    print("-" * 80)
    print(f"{'Test Name':<45} {'Format':<8} {'Time (ms)':<12} {'Conf':<8} {'Acc':<8} {'Status'}")
    print("-" * 80)
    
    for result in all_results:
        status = "✓ PASS" if result.passed else "✗ FAIL"
        print(f"{result.test_name:<45} {result.image_format:<8} {result.processing_time_ms:<12.1f} "
              f"{result.avg_confidence:<8.4f} {result.validation_results['overall_accuracy']:<8.1%} {status}")
    
    print("-" * 80)
    print()
    
    # -------------------------------------------------------------------------
    # ACTUAL OCR OUTPUT SAMPLE
    # -------------------------------------------------------------------------
    print("=" * 80)
    print("SAMPLE OCR OUTPUT (Clean Synthetic PNG - First 50 lines)")
    print("=" * 80)
    print()
    
    if clean_png_result:
        lines = clean_png_result.full_text.split("\n")
        for i, line in enumerate(lines[:50], 1):
            print(f"{i:3d}: {line}")
        if len(lines) > 50:
            print(f"... ({len(lines) - 50} more lines)")
    print()
    
    # -------------------------------------------------------------------------
    # DETECTED OCR ERRORS
    # -------------------------------------------------------------------------
    print("=" * 80)
    print("DETECTED OCR ERRORS AND ISSUES")
    print("=" * 80)
    print()
    
    error_count = 0
    
    for result in all_results:
        if result.errors:
            error_count += 1
            print(f"Test: {result.test_name}")
            for error in result.errors:
                print(f"  - {error}")
            print()
    
    if error_count == 0:
        print("✓ No processing errors detected")
        print()
    
    # -------------------------------------------------------------------------
    # FINAL VERDICT
    # -------------------------------------------------------------------------
    print("=" * 80)
    if passed_tests == total_tests:
        print("✓ ALL TESTS PASSED - PaddleOCR is production-ready for medical images")
    elif passed_tests / total_tests >= 0.8:
        print("✓ MOST TESTS PASSED - PaddleOCR is suitable with minor limitations")
    elif passed_tests / total_tests >= 0.6:
        print("⚠ PARTIAL PASS - PaddleOCR works but has notable accuracy issues")
    else:
        print("✗ INSUFFICIENT ACCURACY - PaddleOCR needs improvement for medical use")
    print("=" * 80)
    print()
    
    return 0 if passed_tests / total_tests >= 0.6 else 1


if __name__ == "__main__":
    sys.exit(main())
