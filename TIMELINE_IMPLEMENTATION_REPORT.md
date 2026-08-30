# Timeline Implementation Report

Medicare AI — Timeline feature, implemented against the real backend/document
system in this repository (`C:/Users/Connect2Aryans/medicare-ai`).

## Implementation Summary

The Timeline is now a real, data-driven feature:

- **Backend**: new `GET /api/timeline` endpoint that derives timeline events
  from the documents actually stored by the FastAPI backend's document store
  (`InMemoryDocumentStore`, persisted as JSON under `.uploads/`). One event per
  stored document, sorted newest first. Only information that actually exists
  on the record is exposed — event type is classified from the document's real
  filename/extracted text (lab keywords → `Lab Result`, imaging keywords →
  `Imaging`, etc., defaulting honestly to `Medical Report`); the description is
  a real excerpt of the document's extracted text.
- **Backend**: new `GET /api/documents/{document_id}` endpoint so the Documents
  detail page can render real backend documents (needed for the Timeline
  "Open source document" deep link).
- **Frontend**: `fetchTimeline()` added to the existing API layer
  (`frontend/lib/api.ts`) calling the real endpoint with response validation and
  **no demo fallback**. The Timeline page was replaced from a
  `PagePlaceholder` with a full implementation showing loading / success /
  empty / error states, date grouping, expand/collapse cards, metadata, and
  source-document links using real document IDs.
- **Frontend**: the Documents detail page (`/documents/[id]`) now falls back to
  the real backend record when the ID is not a demo/localStorage document, so
  Timeline deep links land on real data instead of "Document not found".

No demo medical events, no `DEMO_TIMELINE`, no simulated delays, and no fake
fallback data are used anywhere in the Timeline path.

## Files Changed

| File | Change |
| --- | --- |
| `backend/app/main.py` | Added `GET /api/timeline` and `GET /api/documents/{document_id}` endpoints with Pydantic response models. |
| `backend/app/document_pipeline.py` | Added `classify_document_event()` and `build_event_description()` helpers that derive timeline fields from real document content. |
| `backend/tests/test_api.py` | Added tests: timeline returns real uploaded-document events (correct id/title/type/description/metadata, newest-first sort) and empty-store behavior. |
| `frontend/lib/api.ts` | Added `fetchTimeline()` (+ `TimelineEvent` types, response normalization) and `fetchDocument()` calling the real backend. No demo fallback. |
| `frontend/app/(app)/timeline/page.tsx` | Replaced placeholder with the real Timeline page: API fetch, loading/success/empty/error states, retry, date grouping, accessible expand/collapse, metadata, deep links, responsive glassmorphism layout. |
| `frontend/app/(app)/documents/[id]/page.tsx` | Added real-backend fallback lookup for IDs not in demo/localStorage data (with loading and honest not-found states) so Timeline deep links work with real document IDs. |

Untracked runtime artifacts (`.uploads/*.json`, `__pycache__`, `package-lock.json`)
were left as-is; nothing was committed or pushed.

## Backend

- **Endpoint**: `GET /api/timeline` → `{ "events": [ { id, date, title, type, description, documentId, metadata } ] }`
  matching the preferred contract. `id` is `evt-<document_id>`, `date` is the
  document's real `created_at` (ISO-8601 UTC), `documentId` is the real store ID.
- **Also added**: `GET /api/documents/{document_id}` → full stored record
  (title, filename, content type, extracted text, chunk count, metadata,
  processed flag, created_at); 404 when unknown.
- **Database source**: the repository's existing document store
  (`backend/app/storage.py`). This project has no SQL database — documents
  uploaded via `POST /api/documents/upload` are held in memory and persisted as
  JSON files in `.uploads/`. The timeline reads from that same store, so it
  reflects exactly what was really uploaded. No duplicate data layer was
  introduced.
- **Authentication/user filtering**: **not implemented, and honestly not
  implementable in the current backend** — the backend has no user model, no
  sessions, and `POST /api/documents/upload` accepts anonymous uploads. User
  isolation is currently enforced only at the frontend by Supabase auth +
  `frontend/middleware.ts` (unauthenticated users are redirected to `/login`
  before the Timeline can render). Per-user filtering requires adding a user
  identity to the backend document model — a backend schema decision for the
  owner (see Known Issues).
- **Response contract**: as specified in the task (`events` array with
  `id/date/title/type/description/documentId/metadata`), types restricted to
  the six allowed values.

## Frontend

- **Timeline page** (`/timeline`, protected by existing middleware): page
  header, vertical timeline line, newest-first events grouped by date, event
  type badges/icons, per-card expand/collapse, metadata grid (keys
  humanized), and an "Open source document" link.
- **API integration**: `fetchTimeline()` uses the existing
  `NEXT_PUBLIC_API_BASE_URL` convention from `lib/api.ts` (defaults to
  `http://localhost:8000`, matching the repo's existing API calls). No
  hardcoded URLs beyond the existing convention; no changes to `.env.local`.
- **States**: loading spinner with `role="status" aria-live="polite"`; error
  card with the real failure message and a Retry button; empty state ("No
  medical timeline events yet.") with an Upload CTA; success renders the real
  events. On API failure the page **never** falls back to demo data.
- **Responsive behavior**: verified at 1280px and 390px viewports — single-column
  layout on mobile, metadata grid collapses to one column, long document
  IDs/filenames truncate or wrap, no horizontal overflow.
- **Accessibility**: semantic `<ol>`/headings, real `<button>` toggles with
  `aria-expanded`/`aria-controls`, visible focus rings, accessible loading and
  error announcements (`role="status"`, `role="alert"`), icon `aria-hidden`,
  links as links. No clickable divs.
- **Event types**: only the six contract types are rendered; classification
  comes from real document content, and unclassifiable documents display
  honestly as "Medical Report" with their real filename as the title.

## Real Data Verification

**Timeline WAS tested using REAL BACKEND DATA**:

- Real PDFs were uploaded through the real `POST /api/documents/upload`
  endpoint (two medical lab-style text PDFs), then `GET /api/timeline`
  returned events for exactly those documents (verified via curl and in the
  browser UI).
- The Timeline UI rendered those real events (real titles, real extracted-text
  descriptions, real document IDs), and "Open source document" navigated to
  `/documents/<real-id>`, which the updated detail page rendered from
  `GET /api/documents/<real-id>` (real extracted text and metadata).
- Error, retry, and empty states were verified against a genuinely stopped
  backend and a genuinely empty store — no demo data appeared at any point.

**What could NOT be verified end-to-end**: the authenticated `/timeline` route
itself. Login is real Supabase email/password auth; the repo's documented demo
credentials (`demo@medcare.ai` / `medcare123`) are invalid against the live
Supabase project, and creating a new account requires an email confirmation
link to an inbox I cannot access. Verification was therefore done through a
temporary unprotected route that rendered the exact same Timeline page
component (same code, same real API call), and by confirming the middleware
correctly redirects unauthenticated `/timeline` visits to
`/login?next=%2Ftimeline`. The temporary route was deleted after testing; the
final `npm run build` contains only the real routes.

## Tests Performed

```text
pytest backend/tests/test_api.py — PASS (8 passed; includes 2 new timeline tests)
npm run build (frontend) — PASS (all 14 routes compiled, temp test routes removed)
npm run dev — PASS (existing dev server on :3000 hot-reloaded changes)
GET /api/health — PASS
GET /api/timeline (populated store) — PASS (real events, newest first)
GET /api/timeline (empty store) — PASS ({events: []})
GET /api/documents/{id} (real id) — PASS
GET /api/documents/{id} (unknown id) — PASS (404)
Timeline browser test (component via temp route) — PASS
Real API request in browser (Network: :8000/api/timeline) — PASS
No demo data in Timeline — PASS (verified against real uploads)
Loading state — PASS
Empty state — PASS (fresh backend store)
Error state — PASS (backend stopped → real error shown)
Retry works — PASS (backend restarted via Retry click → recovered)
Expand/collapse works — PASS (aria-expanded toggles, detail panel renders)
Source document navigation — PASS (/documents/<real-id> renders real record)
Unauthenticated /timeline redirect — PASS (/login?next=%2Ftimeline)
Mobile layout (390×844) — PASS (no overflow, screenshot verified)
Desktop layout (1280×800) — PASS (screenshot verified)
Existing pages unaffected — PASS (build compiles; documents/login/upload untouched in behavior)
```

## Known Issues

1. **Per-user data isolation is not enforced by the backend.** The backend has
   no user model; any document uploaded by anyone is returned by
   `GET /api/timeline`. Implementing user-scoped events requires adding user
   identity (e.g. Supabase JWT forwarding) to the upload/document model — a
   backend architecture decision left to the owner. The frontend route remains
   auth-protected via existing middleware.
2. **Authenticated browser pass of `/timeline` itself could not be completed**
   (Supabase email confirmation inaccessible; demo credentials invalid).
   Verified via an identical-component temp route and middleware redirect
   checks instead — see Real Data Verification.
3. **Event granularity is one event per document.** The backend's extraction
   pipeline currently stores only raw text + basic metadata, so richer events
   (individual lab values, diagnoses, medications per document) would require
   extending the existing extraction pipeline. Nothing was fabricated to fill
   this gap.
4. **In-memory document store resets on backend restart** (existing repository
   behavior, unchanged). Timeline reflects whatever documents currently exist
   in the store.

Everything else is complete: no known Timeline-specific functional issues.

## Git Status

All changes were intentionally left **uncommitted and unpushed** in
`C:/Users/Connect2Aryans/medicare-ai` (working tree on `main`). No `git add`,
`git commit`, `git push`, branch changes, or PRs were performed — the owner
will review and push manually.
