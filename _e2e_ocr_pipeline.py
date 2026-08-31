"""LIVE E2E test of the Phase 1 OCR pipeline against the real Supabase
project: real user -> real token -> upload -> Supabase Storage -> PaddleOCR
-> extracted text -> database row -> retrieval.

Prints IDs, statuses, and short text samples only — never secrets.
"""
from __future__ import annotations

import io
import os
import secrets
import sys
import time
from pathlib import Path

sys.path.insert(0, ".")

from dotenv import load_dotenv  # noqa: E402

load_dotenv(".env", override=False)

from supabase import create_client  # noqa: E402

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
ANON_KEY = os.environ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

service = create_client(SUPABASE_URL, SERVICE_KEY)

# ── Step 1: create a real, email-confirmed test user ────────────────────────
stamp = int(time.time())
email = f"ocr-e2e-{stamp}@medicare-ai.test"
password = secrets.token_urlsafe(24)  # random, never printed
user = service.auth.admin.create_user({
    "email": email,
    "password": password,
    "email_confirm": True,
})
inner = getattr(user, "user", None) or user  # UserResponse wraps .user
user_id = getattr(inner, "id", None) or inner["id"]
print(f"[1] user created: {email} (id={user_id})")

# ── Step 2: sign in as that user (anon key) to get a REAL access token ─────
anon = create_client(SUPABASE_URL, ANON_KEY)
session = anon.auth.sign_in_with_password({"email": email, "password": password})
token = session.session.access_token
print("[2] signed in: real Supabase access token obtained (not printed)")

# ── Step 3: upload the real medical report through the backend API ─────────
from fastapi.testclient import TestClient  # noqa: E402

from backend.app.main import app  # noqa: E402

client = TestClient(app)
headers = {"Authorization": f"Bearer {token}"}

png_bytes = Path("test_medical_report.png").read_bytes()
resp = client.post(
    "/api/documents/upload",
    files={"file": ("medical_report.png", png_bytes, "image/png")},
    data={"title": "E2E CBC Report"},
    headers=headers,
)
print(f"[3] upload HTTP {resp.status_code}")
resp.raise_for_status()
payload = resp.json()
doc_id = payload["document_id"]
print(f"    document_id={doc_id}")
print(f"    status={payload['status']} storage_synced={payload['storage_synced']} "
      f"supabase_synced={payload['supabase_synced']} page_count={payload['page_count']}")
assert payload["status"] == "processed", f"expected processed, got {payload['status']}"

# ── Step 4: verify the DATABASE row (service role, column values OK here) ──
row = service.table("documents").select("*").eq("id", doc_id).limit(1).execute().data[0]
print(f"[4] DB row: user_id matches={row['user_id'] == user_id} "
      f"processing_status={row['processing_status']} "
      f"extracted_text_len={len(row.get('extracted_text') or '')}")
assert row["user_id"] == user_id
assert row["processing_status"] == "processed"
text = row.get("extracted_text") or ""
assert text.strip(), "extracted_text is empty in DB"
print(f"    text sample: {text[:180].replace(chr(10), ' | ')}")

# ── Step 5: verify the raw file landed in Supabase Storage ─────────────────
storage_path = row.get("storage_path") or ""
listing = service.storage.from_("medical-documents").list(
    path="/".join(storage_path.split("/")[:-1])
)
names = [item.get("name") for item in listing]
print(f"[5] storage: bucket 'medical-documents' path '{storage_path}' "
      f"object_present={storage_path.split('/')[-1] in names}")

# ── Step 6: GET the document back through the backend (AI access path) ────
detail = client.get(f"/api/documents/{doc_id}", headers=headers)
print(f"[6] GET /api/documents/{{id}} HTTP {detail.status_code}")
detail.raise_for_status()
assert "Hemoglobin" in detail.json()["text"], "AI-accessible text missing OCR content"
print("    AI can access the extracted text via the API OK")

# ── Step 7: document appears in the user's list ────────────────────────────
listing_resp = client.get("/api/documents", headers=headers)
listing_resp.raise_for_status()
ids = [d["document_id"] for d in listing_resp.json()]
print(f"[7] GET /api/documents: document_listed={doc_id in ids} total={len(ids)}")

# ── Step 8: WEBP support through the same path ─────────────────────────────
webp_bytes = Path("test_medical_report.webp").read_bytes()
resp2 = client.post(
    "/api/documents/upload",
    files={"file": ("webp_report.webp", webp_bytes, "image/webp")},
    data={"title": "E2E WEBP Report"},
    headers=headers,
)
print(f"[8] WEBP upload HTTP {resp2.status_code} status={resp2.json().get('status')}")
assert resp2.json()["status"] == "processed"
row2 = service.table("documents").select("extracted_text").eq(
    "id", resp2.json()["document_id"]
).limit(1).execute().data[0]
print(f"    DB extracted_text_len={len(row2.get('extracted_text') or '')}")

# ── Step 9: honest FAILURE path — a blank image must be marked 'failed' ────
from PIL import Image  # noqa: E402

buf = io.BytesIO()
Image.new("RGB", (300, 300), "white").save(buf, format="PNG")
resp3 = client.post(
    "/api/documents/upload",
    files={"file": ("blank.png", buf.getvalue(), "image/png")},
    data={"title": "Blank Test"},
    headers=headers,
)
print(f"[9] blank image: HTTP {resp3.status_code} status={resp3.json().get('status')}")
print(f"    error_message={resp3.json().get('error_message')!r}")
blank_id = resp3.json()["document_id"]
row3 = service.table("documents").select("processing_status").eq(
    "id", blank_id
).limit(1).execute().data[0]
print(f"    DB processing_status={row3['processing_status']}")
assert resp3.json()["status"] == "failed"
assert row3["processing_status"] == "failed"

print()
print("ALL E2E STEPS PASSED")
print(f"(test user: {email}; test documents: {doc_id}, "
      f"{resp2.json()['document_id']}, {blank_id})")
