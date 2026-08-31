"""Test the RAG pipeline end-to-end with a simulated CBC document."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from backend.app.config import settings
from backend.app.storage import DocumentRecord
from backend.app.rag import build_medical_answer

cbc_text = """COMPLETE BLOOD COUNT (CBC)

Patient: Test Patient
Date: 2026-08-24

TEST                    RESULT          REFERENCE RANGE     FLAG
Hemoglobin              12.5 g/dL       13.0 - 17.0        Low
PCV (Hematocrit)        57.5%           40 - 50%           High
WBC Count               7200/cumm       4000 - 11000       Normal
Platelet Count          150000/cumm     150000 - 400000    Borderline
RBC Count               4.8 mil/cumm    4.5 - 5.5          Normal
MCV                     88 fL           80 - 100           Normal
MCH                     29 pg           27 - 32            Normal
MCHC                    33 g/dL         32 - 36            Normal

Impression: Hemoglobin slightly below range. PCV elevated above range.
Platelet count at lower borderline. Recommend clinical correlation."""

doc = DocumentRecord(
    document_id='test-cbc-001',
    title='CBC_Report.pdf',
    filename='CBC_Report.pdf',
    content_type='application/pdf',
    text=cbc_text,
    chunks=[
        cbc_text[:500],
        cbc_text[500:],
    ],
    metadata={'filename': 'CBC_Report.pdf'},
    processed=True,
    created_at='2026-08-24',
    owner='test@test.com',
)

result = build_medical_answer(
    'Analyze my CBC report. What values are abnormal?',
    [doc],
)

print("=" * 60)
print("PROVIDER:", result.get('provider'))
print("MODEL:", result.get('model'))
print("CONFIDENCE:", result.get('confidence'))
print("EVIDENCE COUNT:", len(result.get('evidence', [])))
print("=" * 60)
print("ANSWER:")
print(result['answer'])
print("=" * 60)
if result.get('evidence'):
    print("EVIDENCE:")
    for e in result['evidence'][:3]:
        print(f"  [{e['documentName']}] {e['snippet'][:100]}...")
