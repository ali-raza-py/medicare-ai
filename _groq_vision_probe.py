"""Live probe: does a Groq vision model accept image input on this account?
Never prints the API key."""
import backend.app.config  # loads .env
import base64
import io
import os
import sys

from groq import Groq
from PIL import Image, ImageDraw

# Tiny test image with real text
img = Image.new("RGB", (300, 100), "white")
d = ImageDraw.Draw(img)
d.text((20, 40), "Hemoglobin 12.5 g/dL", fill="black")
buf = io.BytesIO()
img.save(buf, format="PNG")
b64 = base64.b64encode(buf.getvalue()).decode("ascii")

client = Groq(api_key=os.environ["MEDICARE_AI_API_KEY"])

models_to_try = [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
]

for model in models_to_try:
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": "Transcribe the text in this image exactly."},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                ],
            }],
            temperature=0.0,
            max_tokens=100,
        )
        print(f"MODEL {model}: OK -> {completion.choices[0].message.content!r}")
    except Exception as exc:
        msg = str(exc)
        # Never print response bodies that might echo the key; print type + short message
        print(f"MODEL {model}: FAILED -> {type(exc).__name__}: {msg[:200]}")
