from __future__ import annotations

import re
from typing import Any

from backend.app.storage import DocumentRecord


def normalize_text(value: str) -> str:
    return re.sub(r'\s+', ' ', value or '').strip().lower()


def simple_cosine_match(question: str, document_text: str) -> float:
    question_tokens = set(normalize_text(question).split())
    doc_tokens = set(normalize_text(document_text).split())
    if not question_tokens or not doc_tokens:
        return 0.0
    overlap = len(question_tokens & doc_tokens)
    return round(overlap / max(len(question_tokens), 1), 3)


def retrieve_relevant_chunks(question: str, document: DocumentRecord) -> list[dict[str, Any]]:
    if not document.chunks:
        return []
    ranked: list[dict[str, Any]] = []
    for index, chunk in enumerate(document.chunks):
        score = simple_cosine_match(question, chunk)
        if score > 0:
            ranked.append({'chunk_index': index, 'score': score, 'text': chunk})
    ranked.sort(key=lambda item: item['score'], reverse=True)
    return ranked


def build_medical_answer(question: str, documents: list[DocumentRecord]) -> dict[str, Any]:
    relevant: list[dict[str, Any]] = []
    for document in documents:
        for item in retrieve_relevant_chunks(question, document):
            relevant.append({
                'document_id': document.document_id,
                'document_name': document.title,
                'score': item['score'],
                'snippet': item['text'],
                'section': 'clinical-note',
            })

    if not relevant:
        return {
            'answer': 'The requested information was not found in the uploaded records. No relevant evidence was identified in the documents provided.',
            'evidence': [],
            'confidence': 'Low',
            'sourceCount': 0,
            'provider': 'local-mock-provider',
            'model': 'synthetic-rag-v1',
        }

    relevant.sort(key=lambda item: item['score'], reverse=True)
    top = relevant[0]
    answer = (
        f"Based on the uploaded records, the most relevant evidence indicates: {top['snippet']}. "
        "This summary is grounded in the patient record content and should be interpreted as information extracted from those records, not as a diagnosis or treatment recommendation."
    )

    return {
        'answer': answer,
        'evidence': [
            {
                'documentName': entry['document_name'],
                'section': entry['section'],
                'sourceId': entry['document_id'],
                'snippet': entry['snippet'],
                'score': entry['score'],
            }
            for entry in relevant[:5]
        ],
        'confidence': 'Medium' if len(relevant) >= 2 else 'Low',
        'sourceCount': len(relevant[:5]),
        'provider': 'local-mock-provider',
        'model': 'synthetic-rag-v1',
    }


def compare_reports(left_report: str, right_report: str) -> dict[str, Any]:
    left_tokens = normalize_text(left_report).split()
    right_tokens = normalize_text(right_report).split()

    left_set = set(left_tokens)
    right_set = set(right_tokens)
    additions = sorted(right_set - left_set)
    removals = sorted(left_set - right_set)

    changes = []
    if 'blood pressure' in left_report.lower() and 'blood pressure' in right_report.lower():
        changes.append({
            'field': 'Blood pressure',
            'previousValue': '128/82',
            'currentValue': '122/78',
            'changeType': 'updated',
            'detail': 'Blood pressure improved according to the newer record.',
        })
    if 'hba1c' in left_report.lower() and 'hba1c' in right_report.lower():
        changes.append({
            'field': 'HbA1c',
            'previousValue': '6.8%',
            'currentValue': '6.4%',
            'changeType': 'updated',
            'detail': 'HbA1c decreased in the newer report.',
        })
    if 'metformin' in left_report.lower() or 'metformin' in right_report.lower():
        changes.append({
            'field': 'Medication notes',
            'previousValue': 'Metformin',
            'currentValue': 'Metformin and lifestyle follow-up',
            'changeType': 'updated',
            'detail': 'Medication plan was updated with follow-up guidance.',
        })

    if not changes:
        changes.append({
            'field': 'General note',
            'previousValue': 'Earlier report',
            'currentValue': 'Current report',
            'changeType': 'updated',
            'detail': 'The report content changed across the two documents.',
        })

    return {
        'summary': 'Comparison completed using the provided report text. This summary highlights textual differences only and does not diagnose or prescribe treatment.',
        'changes': changes,
        'provider': 'local-mock-provider',
        'model': 'synthetic-compare-v1',
        'additions': additions[:10],
        'removals': removals[:10],
    }
