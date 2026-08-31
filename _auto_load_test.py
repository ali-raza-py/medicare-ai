"""Test the auto-load user documents feature."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from backend.app.config import settings
from backend.app.storage import DocumentRecord
from backend.app.auth import AuthUser
from backend.app.document_pipeline import chunk_text

# Import the global store used by main.py (same instance the endpoint uses)
from backend.app.main import store, _auto_load_user_documents

# Add a CBC document to the store for user "test@example.com"
cbc_text = """COMPLETE BLOOD COUNT
Hemoglobin: 12.5 g/dL (Ref: 13.0-17.0) Low
PCV: 57.5% (Ref: 40-50%) High
Platelet Count: 150000/cumm (Ref: 150000-400000) Borderline"""

doc = DocumentRecord(
    document_id='auto-test-001',
    title='CBC_Report.pdf',
    filename='CBC_Report.pdf',
    content_type='application/pdf',
    text=cbc_text,
    chunks=chunk_text(cbc_text),
    metadata={'filename': 'CBC_Report.pdf'},
    processed=True,
    created_at='2026-08-24',
    owner='test@example.com',
)
store.add(doc)

user = AuthUser(sub='test-user-id', email='test@example.com', aud='authenticated')
loaded = _auto_load_user_documents(user, limit=3)
print(f"Auto-loaded {len(loaded)} document(s)")
for d in loaded:
    print(f"  - {d.title} ({len(d.chunks)} chunks, {len(d.text)} chars)")

# Test with different user - should return nothing
other_user = AuthUser(sub='other-user-id', email='other@example.com', aud='authenticated')
loaded_other = _auto_load_user_documents(other_user, limit=3)
print(f"Other user auto-loaded: {len(loaded_other)} document(s) (should be 0)")

# Test RAG with auto-loaded docs
from backend.app.rag import build_medical_answer
if loaded:
    result = build_medical_answer('What are my abnormal values?', loaded)
    print(f"\nProvider: {result.get('provider')} | Confidence: {result.get('confidence')}")
    print(f"Answer preview: {result['answer'][:200]}...")
