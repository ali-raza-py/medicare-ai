import {
  DiagnosticResponse,
  MedicalDocumentRecord,
  MedicalAnswerRequest,
  MedicalAnswerResponse,
  MedicalComparisonRequest,
  MedicalComparisonResponse,
  SymptomAnalysisRequest,
} from '@/types/medical';
import { compareMedicalReports, generateMedicalAnswer } from './medical-rag';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function uploadAndProcessDocument(file: File): Promise<MedicalDocumentRecord> {
  const formData = new FormData();
  formData.append('file', file);

  const uploadResponse = await fetch(`${API_BASE}/api/documents/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!uploadResponse.ok) {
    throw new Error(`Document upload failed: ${uploadResponse.statusText}`);
  }

  const uploaded = await uploadResponse.json() as { document_id: string; title: string; filename: string };
  const processResponse = await fetch(`${API_BASE}/api/documents/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: uploaded.document_id }),
  });
  if (!processResponse.ok) {
    throw new Error(`Document processing failed: ${processResponse.statusText}`);
  }

  return {
    id: uploaded.document_id,
    title: uploaded.title,
    type: file.type.includes('pdf') ? 'PDF' : file.type.includes('image') ? 'Image' : 'Document',
    date: new Date().toISOString().slice(0, 10),
    status: 'Ready',
    summary: 'Uploaded and processed by the MedCare AI backend.',
  };
}

export async function analyzeSymptoms(payload: SymptomAnalysisRequest): Promise<DiagnosticResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Diagnostic API call failed:', error);
    throw error;
  }
}

export async function askMedicalQuestion(
  payload: MedicalAnswerRequest,
): Promise<MedicalAnswerResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/medical-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: payload.question, documents: payload.documents.map((document) => document.id) }),
    });
    if (!response.ok) {
      return generateMedicalAnswer(payload);
    }
    return await response.json();
  } catch {
    return generateMedicalAnswer(payload);
  }
}

export async function compareReports(
  payload: MedicalComparisonRequest,
): Promise<MedicalComparisonResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/compare-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return compareMedicalReports(payload);
    }
    return await response.json();
  } catch {
    return compareMedicalReports(payload);
  }
}
