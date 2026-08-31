"""Quick live check: does this Groq account have a vision-capable model?

Prints model IDs (names only) and tests a tiny image request.
Never prints the API key.
"""
from __future__ import annotations

import base64
import io
import os
from pathlib import Path

# Load env var NAMES from root .env without printing values.
env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

from groq import Groq  # noqa: E402

key = (
    os.environ.get("GROQ_API_KEY")
    or os.environ.get("MEDICARE_AI_API_KEY")
)
if not key:
    print("MISSING_ENV: neither GROQ_API_KEY nor MEDICARE_AI_API_KEY is set")
    raise SystemExit(1)

client = Groq(api_key=key)

print("== All models visible to this Groq account ==")
ids: list[str] = []
try:
    for m in client.models.list().data:
        ids.append(m.id)
    for mid in sorted(ids):
        print("  " + mid)
except Exception as exc:
    print("  model list failed:", type(exc).__name__, str(exc)[:200])

# Candidates: current + historical Groq vision model IDs.
candidates = [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
    "meta-llama/llama-4-scout-17b-16e-instruct-preview",
    "meta-llama/llama-4-maverick-17b-128e-instruct-preview",
]

# Build a tiny 16x16 PNG with a black square via PIL (no file needed).
from PIL import Image  # noqa: E402

buf = io.BytesIO()
Image.new("RGB", (16, 16), "black").save(buf, format="PNG")
img_b64 = base64.b64encode(buf.getvalue()).decode()

print("\n== Vision request test (tiny 16x16 PNG, 'describe this image') ==")
for model in candidates:
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": "Describe this image in one sentence."},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img_b64}"}},
                ],
            }],
            max_tokens=30,
        )
        print(f"  {model} -> OK: {resp.choices[0].message.content[:80]!r}")
    except Exception as exc:
        msg = str(exc)[:160].replace("\n", " ")
        print(f"  {model} -> FAIL: {type(exc).__name__}: {msg}")
