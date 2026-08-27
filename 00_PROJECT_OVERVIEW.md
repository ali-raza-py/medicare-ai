# MedCare AI — Project Overview
**Owner:** Shared project document (Ali Raza + Shabbar)  
**Project:** Alibaba Cloud AI Hackathon Pakistan 2026

## What is MedCare AI?
MedCare AI turns scattered medical records into one organized, chronological, evidence-grounded record that users can search, compare, and understand.

Users can:
1. Upload medical documents.
2. Organize records into a timeline.
3. Browse their document library.
4. Ask questions about information contained in their uploaded records.
5. Compare two reports using **Compare / What Changed?**
6. See supporting source evidence for AI-generated answers.

## Safety boundary
MedCare is not a doctor and should not diagnose, prescribe, or make unsupported clinical decisions. It should organize, retrieve, compare, summarize, and explain information found in the user's uploaded records.

## Core workflow
Medical documents → extraction/OCR → structured information → storage/indexing → retrieval → grounded AI response → source evidence.

## Hero feature
**Compare / What Changed?** is the main differentiator:
Report A + Report B → identify documented differences → show evidence/source documents.

## Target frontend experience
Dashboard → Documents → Upload → Timeline → Ask MediCare AI → Compare / What Changed?

## Current status
Frontend implementation is starting. The backend/AI foundation exists, but the complete production-grade OCR, RAG, evidence, persistent storage, and Alibaba/Qwen integration still need to be verified/implemented.
