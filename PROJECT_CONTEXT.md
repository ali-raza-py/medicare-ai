# MediCare AI — Project Context

## Project Status

Early foundation stage.

The GitHub repository has been created and cloned locally. At the moment, the repository contains only the initial `.gitignore`. Application code has not yet been implemented.

This file is the source of truth for the current project state so coding agents such as Qoder can understand the project without repeatedly reconstructing the context.

---

## Project Purpose

MediCare AI is an AI-powered medical-record understanding application.

The goal is to turn scattered medical reports into a structured, searchable patient record that helps users:

1. Upload medical reports.
2. Extract and organize information from those reports.
3. Build a chronological medical timeline.
4. Ask questions about their uploaded records.
5. Receive answers grounded in the uploaded documents.
6. See supporting source evidence for answers.
7. Compare reports and identify meaningful changes between them.

The core workflow is:

Old report
→ Upload
→ AI processing
→ Timeline created
→ Upload newer report
→ AI processing
→ "What Changed?"
→ Ask MediCare AI
→ Evidence shown

The product should focus on useful, grounded medical-record understanding rather than trying to act as a doctor.

---

## Target MVP

The MVP should prioritize the P0 workflow:

### 1. Document Upload

Users can upload supported medical documents such as PDFs and supported images.

The system should:

- Accept supported files.
- Reject unsupported files clearly.
- Store document metadata.
- Process document text/content.
- Preserve enough information to identify the original source.

### 2. Medical Timeline

Processed reports should be organized chronologically.

The timeline should allow users to understand how their medical records changed over time.

### 3. Ask My Documents

Users can ask questions about their uploaded records.

Answers must be grounded in the user's uploaded documents.

If the required evidence cannot be found, the system should explicitly say that the information was not found in the uploaded documents rather than inventing an answer.

### 4. Source Evidence

AI answers should provide evidence from the relevant uploaded record.

The application should make it clear which document/source supports an answer.

### 5. Report Comparison

Users should be able to compare two medical reports.

The comparison should show available differences between the reports.

The comparison must not present differences as a medical diagnosis.

---

## Planned Technology Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS

### Backend

- Python
- FastAPI

### AI / Document Processing

AI services and document-processing components will be selected during implementation.

Do not hard-code an AI provider or model in this document unless it has actually been chosen and implemented.

---

## Planned Architecture

```text
medicare-ai/
│
├── README.md
├── PROJECT_CONTEXT.md
├── .gitignore
│
├── frontend/
│   └── Next.js + TypeScript + Tailwind
│
└── backend/
    └── FastAPI