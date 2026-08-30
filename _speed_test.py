"""Quick speed test for the Gemini medical-answer endpoint."""
import json
import time
import urllib.request

TOKEN = (
    "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJzdWIiOiJ0ZXN0IiwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIiwiYXVkIjoiYXV0aGVudGljYXRlZCJ9.test"
)

payload = json.dumps({
    "question": "What is normal blood pressure?",
    "documents": [],
    "context": "",
    "history": [],
}).encode()

req = urllib.request.Request(
    "http://localhost:8000/api/medical-answer",
    data=payload,
    headers={
        "Content-Type": "application/json",
        "Authorization": TOKEN,
    },
)

print("Calling Gemini... ", end="", flush=True)
start = time.time()
r = urllib.request.urlopen(req, timeout=120)
elapsed = time.time() - start
data = json.loads(r.read())

print(f"Done in {elapsed:.1f}s")
print(f"Provider : {data.get('provider')}")
print(f"Model    : {data.get('model')}")
print(f"Answer   : {data['answer'][:200]}")
