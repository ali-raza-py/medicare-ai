# MediCare AI — Project Context

## Project Status

The foundation work is complete. The repo has been initialized, the app shell has been converted from the default Next.js template into a MediCare AI dashboard, and the default Vercel starter branding has been removed from the project source.

This file is the current source of truth for the repository state and the hackathon implementation direction.

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

The MVP prioritizes the P0 workflow:

### 1. Document Upload

Users can upload supported medical documents such as PDFs and supported images.

The system should:

- accept supported files
- reject unsupported files clearly
- store document metadata
- process document text/content
- preserve enough information to identify the original source

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

## Completed Work

### Frontend prototype

A working dashboard prototype has been built with the following sections:

- document library and file upload interaction
- medical timeline
- Q&A panel with evidence-grounded responses
- comparison cards for report changes
- branded MediCare AI UI without Vercel starter content

### Cleanup

Default Vercel starter references, starter assets, and generated template metadata were removed from the repo source.

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

## Current Architecture

```text
medicare-ai/
├── app/
│   ├── dashboard/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
├── types/
├── public/
├── README.md
├── PROJECT_CONTEXT.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── .gitignore
└── .next/
```

---

## Implementation Rule

The product must remain evidence-grounded, privacy-conscious, and non-diagnostic. It should help users understand their medical records without replacing a clinician.