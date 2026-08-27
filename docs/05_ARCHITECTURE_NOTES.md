# MedCare AI — Architecture Notes
**OWNER: SHARED — Ali Raza + Shabbar Raza**

## High-level flow
Documents
→ extraction/OCR
→ medical information extraction
→ storage/indexing
→ retrieval
→ AI generation
→ evidence/source response

## Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- Reusable components

## Backend
- FastAPI
- API endpoints for frontend integration
- Document processing
- AI/RAG services
- Validation and error handling

## AI direction
The AI should be grounded in uploaded records. The system should avoid unsupported claims and should be able to state when information was not found in the user's records.

## Future/target data layer
Persistent database + vector retrieval (for example PostgreSQL/pgvector if selected by the technical lead).

## Alibaba Cloud
Alibaba Cloud/Qwen services should be used for genuine technical value, not merely as decoration. Final service choices and integration are owned by Ali.

## Security
- No secrets in Git.
- Use synthetic/de-identified demo medical data.
- Validate uploads and API inputs.
- Keep authentication/authorization boundaries explicit.
