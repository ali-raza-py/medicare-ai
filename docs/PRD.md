# MediCare AI Product Requirements Document

**Version**: 1.0  
**Date**: 2026-08-27  
**Project**: Alibaba Cloud AI Hackathon Pakistan 2026  

---

## 1. Product Definition

### Name
**MediCare AI**

### One-Line Description
A privacy-conscious medical-document intelligence system that enables users to upload personal medical records, organize them chronologically, and ask evidence-grounded questions answered solely from their own uploaded documents.

### Problem
Patients struggle to organize and understand their scattered medical records across multiple providers and timeframes. They lack a way to:
- Centralize their medical history
- Track meaningful changes over time
- Ask questions about their records with clear evidence
- Compare reports and identify patterns

Existing solutions either fail to ground answers in user data or require users to trust their medical data to third-party AI systems without transparency.

### Target Users
- Patients with chronic conditions who need to track health changes
- Patients transitioning care between providers
- Patients seeking to understand their own medical records
- Primary users in Pakistan with locally-relevant healthcare workflows

### Pakistan Relevance
Healthcare infrastructure in Pakistan often requires patients to manually carry medical records between providers. MediCare AI addresses this gap by creating a personal, private, digitized medical record organizer that works offline-first and keeps sensitive medical data under patient control.

### Core Value Proposition
Users retain complete ownership of their medical records. The system extracts meaning from user-provided evidence without inventing medical claims. Answers always show supporting evidence from the user's own documents.

---

## 2. Product Goals

1. **Reliable medical document ingestion** — Users can upload PDF and image medical documents reliably, and the system extracts text without synthesizing or hallucinating content.

2. **Evidence-grounded retrieval** — Questions asked about uploaded records are answered using only information present in the user's documents, with evidence clearly cited.

3. **Longitudinal health understanding** — Users can see medical events organized chronologically and understand changes between reports without the system making medical interpretations it cannot support.

4. **User privacy and data isolation** — Each user's documents are completely isolated; one user cannot access another user's documents through any API or interface.

5. **Transparent AI with honest fallback** — When the system cannot answer a question from available evidence, it says so explicitly rather than generating plausible-sounding but unsupported medical claims.

---

## 3. Non-Goals

The system explicitly does NOT:

- **Diagnose diseases** — It does not analyze symptoms and conclude a diagnosis.
- **Prescribe medication** — It does not recommend treatments.
- **Replace medical professionals** — It is not a substitute for doctor consultations.
- **Provide emergency medical advice** — It is not designed for time-critical medical decisions.
- **Generate unsupported medical claims** — It does not offer medical opinions outside the scope of user-provided evidence.
- **Act as a general medical chatbot** — It answers only about uploaded documents, not general medical knowledge.

---

## 4. Core User Flow

```
1. Register / Log In
   ↓
2. Upload Medical Document (PDF, image)
   ↓
3. System extracts text and metadata
   ↓
4. System processes and chunks document
   ↓
5. Document stored securely, associated with user
   ↓
6. User asks question about their records
   ↓
7. System retrieves relevant sections from user's documents
   ↓
8. AI generates answer grounded in retrieved evidence
   ↓
9. System validates answer is supported by evidence
   ↓
10. Show answer with supporting evidence snippets and source document
   ↓
11. User can inspect original document/evidence
```

---

## 5. Core Features

### A. Authentication
**Purpose**: Ensure only authorized users access their own records.  
**User behavior**: Sign up with email/password or Google OAuth, log in to dashboard.  
**System behavior**: Supabase Auth handles session management; backend validates session and associates data with authenticated user.  
**Acceptance criteria**: Authenticated users can access dashboard; unauthenticated users redirected to login.  
**Current status**: ✅ Implemented  
**Target status**: ✅ No change required  

### B. Secure Document Upload
**Purpose**: Allow users to upload medical files safely without exposing them to public storage.  
**User behavior**: Click upload, select PDF or image, wait for confirmation.  
**System behavior**: Validate file type, store securely associated with user, prevent access by other users.  
**Acceptance criteria**: File accepted, stored, cannot be accessed by other users; invalid files rejected with clear message.  
**Current status**: ⚠️ Partially implemented — upload works but stored in JSON files without user isolation.  
**Target status**: ✅ Upload working, files stored in secure database associated with authenticated user.  

### C. Real Document Extraction / OCR
**Purpose**: Convert PDF/image documents into structured text without fabricating content.  
**User behavior**: Upload document → system processes automatically.  
**System behavior**: Extract text from PDF or run OCR on images; preserve original file as backup.  
**Acceptance criteria**: Text extracted accurately; no synthetic/fake medical data generated from filenames; failed extraction reports honestly (not hidden by fallback data).  
**Current status**: ❌ Not implemented — uses synthetic text generation based on filename keywords.  
**Target status**: ✅ Real extraction using PDF library (PyPDF2 or pdfplumber) + Tesseract OCR for images.  

### D. Document Processing
**Purpose**: Prepare documents for retrieval by chunking and indexing.  
**User behavior**: Automatic, transparent to user.  
**System behavior**: Chunk document into semantic units, extract metadata (date, document type), generate embeddings.  
**Acceptance criteria**: Chunks preserve medical meaning; metadata extracted correctly; processing is deterministic and reproducible.  
**Current status**: ⚠️ Partially implemented — chunks by word count (200 words), lacks semantic understanding.  
**Target status**: ✅ Semantic chunking using medical-domain sentence boundaries; metadata fields for date, type, provider; embeddings computed.  

### E. Medical Timeline
**Purpose**: Display medical events chronologically so users see their health journey.  
**User behavior**: View dashboard timeline, filter by date range or event type.  
**System behavior**: Extract dates from documents, organize events, display in chronological view.  
**Acceptance criteria**: Events appear in correct order; dates are accurate; filtering works.  
**Current status**: ⚠️ UI exists but shows hardcoded demo data; no real timeline from uploaded documents.  
**Target status**: ✅ Timeline generated from document dates and extracted events; backed by real user data.  

### F. Evidence-Grounded Q&A
**Purpose**: Answer questions using only information in user's documents.  
**User behavior**: Type question, submit, receive answer with evidence.  
**System behavior**: Retrieve relevant document chunks, pass to AI with instruction to ground answer in evidence, validate answer before returning.  
**Acceptance criteria**: Answer supported by evidence; evidence snippet shown; answer admits uncertainty if evidence insufficient; no diagnosis/prescription offered.  
**Current status**: ❌ Not implemented — uses word-token overlap retrieval, mock provider, no safety validation.  
**Target status**: ✅ Semantic retrieval + Alibaba/Qwen LLM + structured validation.  

### G. Report Comparison
**Purpose**: Show what changed between two medical reports without diagnosing.  
**User behavior**: Select two documents, request comparison.  
**System behavior**: Extract comparable fields (vital signs, lab values, medication), identify changes, present as factual observation.  
**Acceptance criteria**: Factual differences shown; no medical interpretation ("improved" OK, "indicates recovery" not OK); source evidence visible.  
**Current status**: ⚠️ UI exists but uses hardcoded demo comparison; backend uses keyword matching.  
**Target status**: ✅ Extract structured fields, compute factual differences, avoid medical interpretation.  

### H. Evidence / Citations
**Purpose**: Every answer shows which document/section supports it.  
**User behavior**: Click evidence snippet to see original document.  
**System behavior**: Return source document ID, chunk index, exact snippet, relevance score with every answer.  
**Acceptance criteria**: Evidence always present; clicking evidence shows original document; evidence is verbatim from document.  
**Current status**: ⚠️ API returns evidence structure but backed by synthetic data.  
**Target status**: ✅ Evidence from real retrieved chunks with accurate references.  

### I. AI Safety / Fallback Behavior
**Purpose**: Ensure honest error states when the system cannot answer.  
**User behavior**: Ask question → receive honest "not found" message or error state if system cannot answer.  
**System behavior**: Return structured error response, not fake medical content or demo data.  
**Acceptance criteria**: API failures return error status, not mock answers; missing evidence returns "not found" message, not speculation.  
**Current status**: ❌ Fallback uses hardcoded demo answers and synthetic medical data.  
**Target status**: ✅ All failures return honest error states with no fake medical content.  

---

## 6. AI Requirements

The AI system must:

1. **Use only retrieved evidence** — Do not reference information outside the user's provided documents.

2. **Acknowledge uncertainty** — If the provided evidence is insufficient or contradictory, report this explicitly.

3. **Avoid medical claims outside scope** — Do not diagnose, prescribe, or offer medical advice.

4. **Produce structured output** — Return answers in a consistent format (answer text, confidence level, evidence list).

5. **Cite evidence** — Every factual claim must reference the document chunk that supports it.

6. **Distinguish interpretation from evidence** — If AI must interpret unclear medical terms, mark this as interpretation, not fact.

7. **Refuse unsupported requests** — If asked to diagnose or prescribe, decline politely and explain the system's boundaries.

8. **Gracefully handle "no evidence" cases** — Return "insufficient evidence in your uploaded documents" rather than generating plausible but unsupported answers.

---

## 7. Functional Requirements

### Authentication (FR-001 through FR-010)

**FR-001**: User can sign up with email and password.  
**FR-002**: User can sign up using Google OAuth.  
**FR-003**: User can log in with email and password.  
**FR-004**: Session persists across browser refresh within 24 hours.  
**FR-005**: Unauthenticated users cannot access `/dashboard`.  
**FR-006**: User can log out and clear session.  
**FR-007**: Backend validates every request contains valid Supabase session.  
**FR-008**: User ID is extracted from Supabase token and used to filter data.  
**FR-009**: Expired sessions return 401 Unauthorized.  
**FR-010**: Password must be at least 8 characters.  

### Document Management (FR-011 through FR-030)

**FR-011**: Authenticated user can upload PDF file.  
**FR-012**: Authenticated user can upload image file (JPG, PNG).  
**FR-013**: Non-authenticated user receives 401 when attempting upload.  
**FR-014**: Uploaded file is associated with uploading user; other users cannot access it.  
**FR-015**: File size limit enforced (e.g., 50MB).  
**FR-016**: Invalid file types rejected with clear error message.  
**FR-017**: Uploaded file stored in secure database/object storage, not in repository.  
**FR-018**: File metadata extracted (upload date, filename, detected document type).  
**FR-019**: Document text extracted from PDF without synthesizing content.  
**FR-020**: Document text extracted from images using OCR without synthesizing content.  
**FR-021**: Failed text extraction returns error, not fallback synthetic data.  
**FR-022**: Text is chunked into semantic units (not naive word boundaries).  
**FR-023**: Chunk metadata includes original document, chunk order, span/location.  
**FR-024**: Embeddings computed for each chunk using consistent model.  
**FR-025**: Processing status tracked (uploaded, extracting, chunked, embedded, ready).  
**FR-026**: User can view their uploaded documents.  
**FR-027**: User can delete their own document.  
**FR-028**: Deleted document data removed from all indexes and search.  
**FR-029**: Document list filtered to show only documents belonging to authenticated user.  
**FR-030**: User cannot access document ID that does not belong to them (returns 403).  

### Document Processing (FR-031 through FR-045)

**FR-031**: PDF text extraction uses PDF library (not OS-level tools).  
**FR-032**: OCR fallback used for image documents.  
**FR-033**: OCR can be skipped if document is native PDF with embedded text.  
**FR-034**: Extraction preserves medical structure (headers, sections, tables where possible).  
**FR-035**: Extracted text cleaned of encoding errors and extra whitespace.  
**FR-036**: Processing errors logged but do not crash the system.  
**FR-037**: User notified if document processing fails.  
**FR-038**: Processing is idempotent (reprocessing produces identical results).  
**FR-039**: Chunk size tuned for medical documents (target 300-500 tokens).  
**FR-040**: Chunk boundaries respect medical section breaks (vital signs, lab results, assessment, etc.).  
**FR-041**: Duplicate content not created during processing.  
**FR-042**: Processing time tracked and monitored.  
**FR-043**: Embeddings computed using consistent model across all chunks.  
**FR-044**: Embeddings can be regenerated if model version changes.  
**FR-045**: Processing does not modify original document content.  

### Retrieval (FR-046 through FR-065)

**FR-046**: Question submitted by authenticated user is associated with their user ID.  
**FR-047**: Retrieval queries only documents belonging to authenticated user.  
**FR-048**: Retrieval returns no documents from other users, regardless of query content.  
**FR-049**: Question normalized (lowercased, punctuation removed) before embedding.  
**FR-050**: Question embedding computed using same model as document chunks.  
**FR-051**: Top-K most relevant chunks retrieved (default K=5).  
**FR-052**: Relevance scored by cosine distance or equivalent metric.  
**FR-053**: Minimum relevance threshold enforced (e.g., cosine > 0.3).  
**FR-054**: Retrieved chunks include full text, source document, chunk index.  
**FR-055**: Context window bounded (total tokens <= 2000) to prevent prompt explosion.  
**FR-056**: Context ranked by relevance score.  
**FR-057**: If no chunks meet threshold, return empty result (no retrieval).  
**FR-058**: Retrieval time < 500ms for typical queries.  
**FR-059**: Retrieved chunks never include another user's data.  
**FR-060**: Retrieved chunks can be validated by user (shown with full source reference).  
**FR-061**: Retrieval failures return error, not fake results.  
**FR-062**: Retrieval is deterministic for identical queries.  
**FR-063**: Context construction produces valid prompt input (no truncation mid-sentence).  
**FR-064**: Retrieval metadata logged (query, user, results count, relevance scores).  
**FR-065**: Retrieval does not expose chunk IDs or embeddings to frontend.  

### Q&A (FR-066 through FR-085)

**FR-066**: Question must be minimum 3 characters, maximum 500 characters.  
**FR-067**: Question submitted to backend with user_id context.  
**FR-068**: If no documents uploaded, return error "Upload documents first."  
**FR-069**: If no relevant evidence found, return "Not found in your documents."  
**FR-070**: AI receives grounded context (retrieved chunks only, no external knowledge).  
**FR-071**: AI instructed to acknowledge uncertainty.  
**FR-072**: AI output structured (answer, confidence, evidence list).  
**FR-073**: AI output validated for medical safety (no diagnosis/prescription).  
**FR-074**: Confidence level returned (High / Medium / Low).  
**FR-075**: Evidence list returned with answer (max 5 snippets).  
**FR-076**: Each evidence item includes: document name, chunk index, snippet text, relevance score.  
**FR-077**: AI provider info returned (model name, provider name).  
**FR-078**: API failure returns error status, not cached mock answer.  
**FR-079**: AI timeout (>30s) returns error, not partial response.  
**FR-080**: Response latency tracked and monitored.  
**FR-081**: Prompt injection attempt detected and logged (special chars in question).  
**FR-082**: Answer does not include medical advice outside evidence scope.  
**FR-083**: Answer does not claim diagnosis or prescription.  
**FR-084**: User can report low-quality answers for improvement.  
**FR-085**: Questions and answers logged for quality improvement (without exposing medical data in logs).  

### Comparison (FR-086 through FR-100)

**FR-086**: User selects two documents to compare.  
**FR-087**: Both documents must belong to authenticated user.  
**FR-088**: System extracts comparable fields (vital signs, lab values, dates, medications).  
**FR-089**: Changes presented as factual difference (e.g., "Blood pressure 128/82 → 122/78").  
**FR-090**: Changes do not include medical interpretation (e.g., not "improved significantly").  
**FR-091**: Comparison does not diagnose or prescribe.  
**FR-092**: Comparison shows date range, documents compared, fields analyzed.  
**FR-093**: Evidence for each change visible (snippet from each document).  
**FR-094**: Field extraction handles missing/incomplete data gracefully.  
**FR-095**: Comparison result cached if documents unchanged.  
**FR-096**: API failure returns error, not demo data.  
**FR-097**: User cannot compare documents they don't own.  
**FR-098**: Comparison includes original document references.  
**FR-099**: Comparison does not create medical claims.  
**FR-100**: Comparison is reproducible for identical inputs.  

### Error Handling & Validation (FR-101 through FR-115)

**FR-101**: API returns 400 for invalid input (e.g., empty question).  
**FR-102**: API returns 401 for missing/invalid authentication.  
**FR-103**: API returns 403 for document access denied.  
**FR-104**: API returns 404 for document not found.  
**FR-105**: API returns 500 with generic message if backend error (no internal details).  
**FR-106**: API error response is consistent JSON schema.  
**FR-107**: Frontend displays error message without technical jargon.  
**FR-108**: File upload validates MIME type and magic bytes.  
**FR-109**: File upload scans for malware/suspicious content (if applicable).  
**FR-110**: Prompt validation blocks very long inputs (>1000 chars).  
**FR-111**: Database queries use parameterized queries (no SQL injection).  
**FR-112**: API responses do not expose sensitive paths or environment details.  
**FR-113**: All external API calls (Alibaba, etc.) have timeout/retry logic.  
**FR-114**: Network failures produce user-facing error, not silent failures.  
**FR-115**: Validation errors do not expose internal logic or data structures.  

---

## 8. Non-Functional Requirements

### Security (NFR-SEC-001 through NFR-SEC-010)

**NFR-SEC-001**: Medical data at rest encrypted using database encryption.  
**NFR-SEC-002**: Medical data in transit uses HTTPS only.  
**NFR-SEC-003**: Supabase API keys stored as environment variables, never in code/logs.  
**NFR-SEC-004**: Alibaba/AI provider keys stored as environment variables, never in code/logs.  
**NFR-SEC-005**: Backend never exposes API keys to frontend.  
**NFR-SEC-006**: Database user has minimal required permissions (least privilege).  
**NFR-SEC-007**: API rate limiting enforced (e.g., 100 requests/hour per user).  
**NFR-SEC-008**: CORS configured to allow only frontend origin.  
**NFR-SEC-009**: JWT tokens have short expiration (1 hour, with refresh token).  
**NFR-SEC-010**: Document deletion is permanent; no soft-delete recovery of medical data.  

### Privacy (NFR-PRIV-001 through NFR-PRIV-005)

**NFR-PRIV-001**: User data not shared with third parties without explicit consent.  
**NFR-PRIV-002**: AI/LLM provider access limited to only required data (question + evidence, not full document).  
**NFR-PRIV-003**: Audit logs stored separately, do not include full medical content.  
**NFR-PRIV-004**: User can request data export.  
**NFR-PRIV-005**: User can request complete account deletion with all associated data.  

### Reliability (NFR-REL-001 through NFR-REL-005)

**NFR-REL-001**: System recoverable from database failure within 1 hour.  
**NFR-REL-002**: No data loss on API crash (documents committed before confirmation to user).  
**NFR-REL-003**: Partial failures (e.g., OCR fails but text extraction succeeds) handled gracefully.  
**NFR-REL-004**: System available 99.5% during working hours (target, not guaranteed).  
**NFR-REL-005**: Document processing does not block document list view.  

### Performance (NFR-PERF-001 through NFR-PERF-005)

**NFR-PERF-001**: Document upload acknowledged within 2 seconds.  
**NFR-PERF-002**: Document processing completes within 60 seconds for typical PDF (< 20 pages).  
**NFR-PERF-003**: Question answered within 5 seconds.  
**NFR-PERF-004**: Dashboard loads within 3 seconds for authenticated user.  
**NFR-PERF-005**: No performance degradation with 1000+ documents per user (target; actual performance TBD).  

### Maintainability (NFR-MAINT-001 through NFR-MAINT-003)

**NFR-MAINT-001**: Code follows consistent style (ESLint for frontend, Black/Pylint for backend).  
**NFR-MAINT-002**: All public functions have docstrings.  
**NFR-MAINT-003**: Dependencies kept up to date with security patches.  

### Observability (NFR-OBS-001 through NFR-OBS-005)

**NFR-OBS-001**: All API endpoints log request (without sensitive data) and response time.  
**NFR-OBS-002**: Processing pipeline logs each stage completion.  
**NFR-OBS-003**: AI provider calls logged with latency and token usage.  
**NFR-OBS-004**: Errors logged with stack trace (backend only, not frontend).  
**NFR-OBS-005**: Metrics exposed for monitoring (e.g., Prometheus format).  

### Cost Awareness (NFR-COST-001)

**NFR-COST-001**: AI provider usage monitored and cost tracked per user/document.  

---

## 9. Success Criteria

All success criteria must be verifiable without inventing data.

### Core Functionality
- ✅ A real PDF document can be uploaded and text extracted without synthetic fallback.
- ✅ A real image document can be uploaded and OCR'd without synthetic fallback.
- ✅ Uploaded documents persist in database after server restart.
- ✅ Uploaded documents belong to authenticated user (verified via audit log or direct API test).
- ✅ One user cannot retrieve another user's document via API.
- ✅ A question retrieves relevant evidence from uploaded documents.
- ✅ AI generates answer based on retrieved evidence.
- ✅ Answer includes supporting evidence snippets.
- ✅ Answer includes source document reference.

### Security & Isolation
- ✅ API call without authentication returns 401.
- ✅ API call with invalid user token returns 401.
- ✅ API call with valid token but requesting another user's document returns 403.
- ✅ Backend filters documents by user_id before any query.
- ✅ Database has user_id column and index on documents table.

### Error Handling
- ✅ Failed PDF extraction returns error message, not synthetic medical data.
- ✅ Failed OCR returns error message, not synthetic medical data.
- ✅ Question with no matching evidence returns "not found" message, not fabricated answer.
- ✅ API failure returns error status, not cached mock/demo answer.
- ✅ Network timeout returns error message, not partial response.

### AI Quality
- ✅ AI answers grounded in retrieved evidence (can trace each claim to a document chunk).
- ✅ AI refuses diagnosis/prescription requests explicitly.
- ✅ Confidence level provided (High/Medium/Low) with explanation.
- ✅ Answer does not claim medical authority or prescribe treatment.

### Data Quality
- ✅ No hardcoded demo medical data in API responses (except during initial UI demo/testing).
- ✅ No synthetic medical data generated from filenames.
- ✅ Timeline events extracted from real uploaded documents, not demo data.
- ✅ Comparison shows real changes between documents, not hardcoded values.

---

## 10. Scope Priorities

### P0 (Required for Competitive Submission)

- Authentication working (current status: ✅ done)
- Real document upload with file validation (current: ⚠️ partially done)
- Real text extraction from PDF/images without synthesis (current: ❌ needs implementation)
- Secure database storage with user isolation (current: ❌ needs implementation)
- Semantic retrieval from user documents only (current: ❌ needs implementation)
- Alibaba/Qwen AI provider integration (current: ❌ needs implementation)
- Safety validation (no diagnosis/prescription in answers) (current: ❌ needs implementation)
- Evidence display with source references (current: ⚠️ needs real data)
- Error handling (honest failures, no fake medical data) (current: ❌ needs implementation)

### P1 (High-Value Improvements)

- Medical timeline from extracted dates/events (current: ⚠️ UI exists, needs real data)
- Report comparison with factual changes (current: ⚠️ UI exists, needs real extraction)
- OCR for scanned documents (current: ❌ needs implementation)
- Semantic chunking for medical content (current: ⚠️ basic chunking exists)
- Confidence scoring with grounding validation (current: ⚠️ hardcoded, needs real validation)
- Audit logging for access/queries (current: ❌ needs implementation)
- User data export functionality (current: ❌ needs implementation)

### P2 (Optional)

- Document full-text search across all documents (current: ❌ nice-to-have)
- Bulk upload support (current: ❌ nice-to-have)
- Document sharing with family members (current: ❌ future feature)
- Document annotation/notes (current: ❌ future feature)
- Advanced filtering/querying on timeline (current: ❌ nice-to-have)

### CUT (Do Not Build)

- Medical diagnosis feature (out of scope; explicitly excluded)
- Treatment recommendation (out of scope; explicitly excluded)
- Telehealth/provider integration (beyond hackathon scope)
- Wearable device integration (beyond hackathon scope)
- Insurance claim submission (beyond hackathon scope)
- Lab order placement (beyond hackathon scope)

---

## 11. Out of Scope for MVP

- Multi-language support (English only for hackathon)
- Advanced visualization (charts, graphs)
- Predictive analytics
- Integration with external EHR systems
- FHIR/HL7 standards (recognize but not required)
- Mobile application (web only for hackathon)

---

## 12. Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Document upload success rate | 100% for valid PDFs/images | Manual testing + automated tests |
| Text extraction accuracy | No synthetic fallback | Verify extracted text matches original |
| User isolation enforcement | 0 unauthorized access | Attempt cross-user document access via API |
| Question retrieval relevance | Top 1-3 results contain answer | Manual review of test questions |
| AI answer grounding | 100% claims traceable to evidence | Verify each statement has source chunk |
| API uptime during demo | 99%+ | Monitor during live demo |
| Answer latency | < 5 seconds | Measure response time |

---

## Appendix: Current Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Authentication | ✅ Implemented | Supabase auth working, just needs credentials |
| Frontend dashboard UI | ✅ Built | Layout and styling complete, uses demo data |
| Document upload endpoint | ✅ Built | Works, but no user isolation or secure storage |
| Text extraction | ❌ Mock only | Returns synthetic data based on filename |
| Database | ❌ Not integrated | Uses JSON files in repository |
| User isolation | ❌ Not implemented | No user_id on documents, all documents global |
| Embeddings/Retrieval | ❌ Not implemented | Only word-token overlap exists |
| AI provider integration | ❌ Not implemented | Stub only, raises NotImplementedError |
| Safety validation | ❌ Not implemented | No checks for diagnosis/prescription |
| Error handling | ⚠️ Partial | Falls back to hardcoded demo data |

---
