"""Find the real uploaded medical report documents in the store."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from backend.app.main import store

docs = store.list()
print(f"Total documents in store: {len(docs)}")

# Search for test_medical_report
print("\n--- Documents containing 'medical' or 'test_medical' ---")
for d in docs:
    if 'medical' in (d.title or '').lower() or 'medical' in (d.filename or '').lower():
        text_preview = (d.text or '')[:150].replace('\n', ' ')
        print(f"  [{d.document_id}] {d.title} | owner={d.owner} | text_len={len(d.text or '')} | chunks={len(d.chunks)}")
        if d.text:
            print(f"    text: {text_preview}")

# Search for CBC-like content
print("\n--- Documents containing 'hemoglobin' or 'CBC' in text ---")
for d in docs:
    text_lower = (d.text or '').lower()
    if 'hemoglobin' in text_lower or 'cbc' in text_lower or 'complete blood' in text_lower:
        text_preview = (d.text or '')[:200].replace('\n', ' ')
        print(f"  [{d.document_id}] {d.title} | owner={d.owner} | text_len={len(d.text or '')}")
        print(f"    text: {text_preview}")

# Search for webp/png uploads
print("\n--- Documents with .webp or .png extension ---")
for d in docs:
    if (d.filename or '').lower().endswith('.webp') or (d.filename or '').lower().endswith('.png'):
        text_preview = (d.text or '')[:150].replace('\n', ' ')
        print(f"  [{d.document_id}] {d.title} | owner={d.owner} | text_len={len(d.text or '')}")
        if d.text:
            print(f"    text: {text_preview}")

# Check unique owners
owners = set()
for d in docs:
    owners.add(d.owner)
print(f"\n--- Unique owners in store: {owners}")
