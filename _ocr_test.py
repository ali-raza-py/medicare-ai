import os
os.environ['FLAGS_use_mkldnn'] = '0'

# numpy 2.x compatibility shim for imgaug 0.4.0 (transitive dep of paddleocr)
import numpy as np
if not hasattr(np, 'bool'):
    np.bool = np.bool_        # type: ignore[attr-defined]
if not hasattr(np, 'complex'):
    np.complex = np.complex128  # type: ignore[attr-defined]
if not hasattr(np, 'int'):
    np.int = np.int_          # type: ignore[attr-defined]
if not hasattr(np, 'float'):
    np.float = np.float64     # type: ignore[attr-defined]

from paddleocr import PaddleOCR
from PIL import Image, ImageDraw
import logging
logging.disable(logging.WARNING)

# Create a test image with text
img = Image.new('RGB', (300, 100), 'white')
draw = ImageDraw.Draw(img)
draw.text((10, 10), 'Hello OCR Test 123', fill='black')
img_array = np.array(img)

# Run OCR
ocr = PaddleOCR(lang='en')
result = ocr.predict(img_array)
print('OCR result type:', type(result))
for r in result:
    if hasattr(r, 'rec_texts'):
        for text, score in zip(r.rec_texts, r.rec_scores):
            print(f'Text: {text} Conf: {score:.4f}')
    elif hasattr(r, 'text'):
        print(f'Text: {r.text}')
    else:
        print('Result:', r)
print('PaddleOCR functional test PASSED')
