"""Direct Gemini speed test — bypasses FastAPI entirely."""
import os
import time

# Load .env manually
from pathlib import Path
env_path = Path.cwd() / '.env'
for line in env_path.read_text().splitlines():
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, v = line.split('=', 1)
        os.environ.setdefault(k.strip(), v.strip())

api_key = os.environ['MEDICARE_AI_API_KEY']
model = os.environ.get('MEDICARE_AI_MODEL', 'gemini-3.6-flash')
print(f"Model: {model}")
print(f"Key:   {api_key[:12]}...")

from google import genai
from google.genai import types

client = genai.Client(api_key=api_key)
print("Client ready. Calling Gemini... ", end="", flush=True)

start = time.time()
response = client.models.generate_content(
    model=model,
    contents="What is normal blood pressure? Answer in one sentence.",
    config=types.GenerateContentConfig(
        automatic_function_calling=types.AutomaticFunctionCallingConfig(
            disable=True,
        ),
    ),
)
elapsed = time.time() - start
print(f"Done in {elapsed:.1f}s")
print(f"Answer: {response.text[:200]}")
