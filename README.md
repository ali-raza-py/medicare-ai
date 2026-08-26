# MediCare AI

MediCare AI is a patient-focused medical-record intelligence dashboard for organizing and understanding uploaded documents, timeline data, and clinical evidence without providing diagnoses or prescriptions.

## Project goal

The current demo focuses on the core MVP flow defined in the project context:

- upload medical files and preserve source metadata
- organize records into a proper chronology
- answer patient questions using uploaded evidence only
- show evidence snippets from source documents
- compare report changes across time without turning the app into a diagnosis tool

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

### Backend

Install the Python dependencies and start FastAPI in a second terminal:

```bash
python -m pip install -r requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```

The frontend uses `http://localhost:8000` by default. Set `NEXT_PUBLIC_API_BASE_URL` when the backend is hosted elsewhere. CORS origins can be configured with `CORS_ALLOWED_ORIGINS`.

## Current status

The repository now includes a working frontend and a minimum FastAPI backend with:

- record overview cards
- PDF/image upload and processing endpoints
- medical timeline section
- evidence-scoped Q&A endpoint with source references
- report comparison endpoint
- configurable AI provider interface

The current backend uses synthetic/de-identified extraction and a local token-overlap retrieval fallback. It does not yet provide OCR, embeddings, a vector database, or a live LLM provider.

## Backend configuration

Optional environment variables:

- `MEDICARE_AI_PROVIDER` (defaults to `mock`)
- `MEDICARE_AI_MODEL` (defaults to `mock-model`)
- `MEDICARE_AI_API_KEY` (required by future non-mock providers; never sent to the browser)
- `MEDICARE_UPLOAD_DIR` (defaults to `./.uploads`)
- `CORS_ALLOWED_ORIGINS` (comma-separated frontend origins)

## Safety boundary

This project is intentionally limited to:

- summarizing uploaded records
- identifying changes over time
- grounding answers in records
- helping users understand source material

It does not provide clinical diagnosis, emergency care advice, or treatment suggestions.
