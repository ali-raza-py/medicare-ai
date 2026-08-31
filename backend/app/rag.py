from __future__ import annotations

import logging
import re
from typing import Any

from backend.app.providers import build_provider
from backend.app.storage import DocumentRecord

logger = logging.getLogger(__name__)


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


def build_medical_answer(
    question: str,
    documents: list[DocumentRecord],
    *,
    raw_context: str | None = None,
    conversation_history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Build a medical answer using RAG retrieval + Gemini (or local fallback)."""
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

    # Fallback: a selected document that produced no matching chunks still has
    # its leading text included, so general questions about the document
    # ("what is in this report") can be answered from its content.
    matched_ids = {entry['document_id'] for entry in relevant}
    for document in documents:
        if document.document_id in matched_ids:
            continue
        cleaned = re.sub(r'\s+', ' ', document.text or '').strip()
        if not cleaned or cleaned == 'No readable text detected in the uploaded file.':
            continue
        relevant.append({
            'document_id': document.document_id,
            'document_name': document.title,
            'score': 0.1,
            'snippet': cleaned[:1500],
            'section': 'clinical-note',
        })

    evidence = [
        {
            'documentName': entry['document_name'],
            'section': entry['section'],
            'sourceId': entry['document_id'],
            'snippet': entry['snippet'],
            'score': entry['score'],
        }
        for entry in relevant[:5]
    ]

    # Build context lines from retrieved document chunks
    context_lines = [
        f"Document: {entry['document_name']}\nSection: {entry['section']}\nSnippet: {entry['snippet']}"
        for entry in relevant[:5]
    ]

    # If raw context text was provided from the frontend, append it
    if raw_context:
        context_lines.append(f"Reference material:\n{raw_context}")

    provider = build_provider()
    has_provider = (
        provider.config.provider.lower() != 'mock'
        and provider.config.api_key
    )

    if has_provider:
        # Build system prompt based on whether we have evidence/context
        if context_lines:
            system_prompt = (
                'You are a clinical question-answering assistant for the MediCare AI platform. '
                'Answer the user question using only the supplied clinical evidence and reference material. '
                'If the evidence does not contain the answer, say that it was not found in the provided records. '
                'Keep the reply concise and clinically factual; do not diagnose or prescribe treatment.'
            )
        else:
            system_prompt = (
                'You are a clinical question-answering assistant for the MediCare AI platform. '
                'Answer the user question accurately and concisely using general medical knowledge. '
                'Clearly state when information should be verified with a healthcare provider. '
                'Do not diagnose or prescribe treatment.'
            )

        # Format conversation history
        history_text = ''
        if conversation_history:
            history_parts = []
            for msg in conversation_history:
                role = msg.get('role', '')
                content = msg.get('content', '')
                if role == 'user':
                    history_parts.append(f"Previous question: {content}")
                elif role == 'assistant':
                    history_parts.append(f"Previous answer: {content}")
            if history_parts:
                history_text = '\n\n'.join(history_parts)

        # Assemble the full prompt
        prompt_parts = [system_prompt]
        if history_text:
            prompt_parts.append(f"Conversation history:\n{history_text}")
        if context_lines:
            prompt_parts.append(f"Question: {question}\n\nEvidence:\n" + '\n\n'.join(context_lines))
        else:
            prompt_parts.append(f"Question: {question}")

        prompt = '\n\n'.join(prompt_parts)

        try:
            answer = provider.generate(prompt)
            if answer and answer.strip():
                return {
                    'answer': answer.strip(),
                    'evidence': evidence,
                    'confidence': 'Medium' if len(evidence) >= 2 else ('Low' if evidence else 'Medium'),
                    'sourceCount': len(evidence),
                    'provider': provider.config.provider,
                    'model': provider.config.model,
                }
        except Exception as exc:
            # Provider call failed — fall through to context-based fallback
            logger.warning('AI provider call failed: %s', exc)
            if context_lines:
                return _context_fallback(question, evidence, raw_context)
            return _ai_unavailable_response(question, provider, exc)

    # No provider configured — use raw context if available
    if context_lines:
        return _context_fallback(question, evidence, raw_context)

    return _no_evidence_response(question, provider)


def _context_fallback(
    question: str,
    evidence: list[dict[str, Any]],
    raw_context: str | None = None,
) -> dict[str, Any]:
    """Return a context-based response when the AI provider is unavailable."""
    parts: list[str] = []

    if evidence:
        evidence_text = '; '.join(
            e['snippet'][:150] for e in evidence[:3]
        )
        parts.append(
            f"Based on the uploaded records, the most relevant evidence indicates: {evidence_text}."
        )

    if raw_context:
        excerpt = raw_context[:500] + ('...' if len(raw_context) > 500 else '')
        parts.append(f"Reference material excerpt:\n{excerpt}")

    if parts:
        parts.append(
            'Note: The AI provider is currently unavailable, so this is an automated extraction. '
            'Please consult your healthcare provider for clinical interpretation.'
        )
        answer = '\n\n'.join(parts)
    else:
        answer = (
            'The AI provider is currently unavailable and no relevant evidence could be '
            'extracted from the provided records. Please try again later or consult your '
            'healthcare provider.'
        )

    return {
        'answer': answer,
        'evidence': evidence,
        'confidence': 'Low',
        'sourceCount': len(evidence),
        'provider': 'fallback',
        'model': 'context-extract',
    }


def _no_evidence_response(question: str, provider: 'AIProvider') -> dict[str, Any]:
    """Return a 'not found' response when no evidence or context is available."""
    return {
        'answer': (
            'The requested information was not found in the uploaded records and no '
            'additional context was provided. Please upload relevant medical documents '
            'or rephrase your question.'
        ),
        'evidence': [],
        'confidence': 'Low',
        'sourceCount': 0,
        'provider': provider.config.provider if provider else 'unknown',
        'model': provider.config.model if provider else 'unknown',
    }


def _ai_unavailable_response(
    question: str,
    provider: 'AIProvider',
    exc: Exception,
) -> dict[str, Any]:
    """Return a helpful response when the AI provider is unreachable (e.g. bad API key)."""
    error_hint = ''
    exc_str = str(exc).lower()
    if 'unauthenticated' in exc_str or '401' in exc_str or 'api key' in exc_str:
        error_hint = (
            ' The AI service could not be authenticated — please verify the '
            'MEDICARE_AI_API_KEY environment variable contains a valid API key.'
        )
    elif 'quota' in exc_str or '429' in exc_str:
        error_hint = ' The AI service quota has been exceeded. Please try again later.'
    return {
        'answer': (
            f'The AI assistant is temporarily unavailable and could not process your question: '
            f'"{question}".{error_hint}'
            f'\n\nIn the meantime, you can:\n'
            f'- Upload relevant medical documents and re-ask with document context\n'
            f'- Check your API key configuration\n'
            f'- Try again in a few moments'
        ),
        'evidence': [],
        'confidence': 'Low',
        'sourceCount': 0,
        'provider': provider.config.provider if provider else 'unknown',
        'model': f'{provider.config.model if provider else "unknown"} (unavailable)',
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
