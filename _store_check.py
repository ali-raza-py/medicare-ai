"""Check what documents are in the local store and Supabase."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from backend.app.main import store, supabase_service
from backend.app.auth import AuthUser
from backend.app.config import settings

print("=" * 60)
print("LOCAL STORE DOCUMENTS")
print("=" * 60)
docs = store.list()
print(f"Total documents in store: {len(docs)}")
for d in docs[:20]:
    text_preview = (d.text or '')[:80].replace('\n', ' ')
    print(f"  [{d.document_id[:8]}] {d.title} | owner={d.owner} | text_len={len(d.text or '')} | chunks={len(d.chunks)}")
    if d.text:
        print(f"    text_preview: {text_preview}...")

print()
print("=" * 60)
print("SUPABASE DOCUMENTS")
print("=" * 60)
if supabase_service.is_available():
    print("Supabase is available")
    # List all documents (service-role mode bypasses RLS)
    all_docs = supabase_service.list_user_documents(user_id=None, limit=10)
    print(f"Total docs in Supabase (all users): {len(all_docs)}")
    for row in all_docs[:10]:
        text = str(row.get('extracted_text') or '')
        print(f"  [{str(row.get('id',''))[:8]}] {row.get('file_name')} | user_id={row.get('user_id','?')[:8] if row.get('user_id') else 'None'} | text_len={len(text)}")
        if text:
            print(f"    text_preview: {text[:80].replace(chr(10), ' ')}...")
else:
    print("Supabase is NOT available")
