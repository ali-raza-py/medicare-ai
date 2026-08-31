"""Read-only schema inspection: print ONLY the column names present on
documents rows. No row values are printed."""
from __future__ import annotations

import os
import sys
from pathlib import Path

env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

from supabase import create_client  # noqa: E402

url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not url or not key:
    print("MISSING_ENV: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set")
    sys.exit(1)

client = create_client(url, key)

print("== documents table column probe (PostgREST errors reveal names) ==")
candidates = [
    "id", "user_id", "file_name", "document_type", "extracted_text",
    "processing_status", "storage_path", "created_at", "updated_at",
    "title", "error_message", "page_count", "ocr_details", "file_size",
    "mime_type", "content_type", "owner_email", "metadata", "status",
]
existing: list[str] = []
for col in candidates:
    try:
        client.table("documents").select(col).limit(0).execute()
        existing.append(col)
    except Exception:
        pass
print("  present: " + ", ".join(existing))
print("  absent : " + ", ".join(c for c in candidates if c not in existing))

print("== processing_status value distribution (counts only) ==")
rows = client.table("documents").select("processing_status").execute()
counts: dict[str, int] = {}
for r in rows.data or []:
    v = str(r.get("processing_status"))
    counts[v] = counts.get(v, 0) + 1
print("  " + repr(counts))

print("== storage buckets (names only) ==")
try:
    buckets = client.storage.list_buckets()
    for b in buckets:
        print(f"  {b.name}  public={getattr(b, 'public', '?')}")
except Exception as exc:
    print(f"  storage list failed: {type(exc).__name__}")
