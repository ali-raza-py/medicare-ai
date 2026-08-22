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

## Current status

The frontend now includes a working MediCare AI dashboard prototype with:

- record overview cards
- document upload panel
- medical timeline section
- grounded Q&A assistant
- source evidence display
- report comparison panel

## Safety boundary

This project is intentionally limited to:

- summarizing uploaded records
- identifying changes over time
- grounding answers in records
- helping users understand source material

It does not provide clinical diagnosis, emergency care advice, or treatment suggestions.
