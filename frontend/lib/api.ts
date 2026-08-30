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
    summary: 'Uploaded and processed by the MediCare AI backend.',
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

// --- Timeline ---

export type TimelineEventType =
  | 'Lab Result'
  | 'Diagnosis'
  | 'Imaging'
  | 'Medication'
  | 'Doctor Visit'
  | 'Medical Report';

export type TimelineEvent = {
  id: string;
  date: string;
  title: string;
  type: TimelineEventType;
  description: string;
  documentId: string;
  metadata: Record<string, string | boolean>;
};

type TimelineApiResponse = {
  events: TimelineEvent[];
};

const TIMELINE_EVENT_TYPES: TimelineEventType[] = [
  'Lab Result',
  'Diagnosis',
  'Imaging',
  'Medication',
  'Doctor Visit',
  'Medical Report',
];

function normalizeTimelineEvents(raw: unknown): TimelineEvent[] {
  if (!Array.isArray(raw)) {
    throw new Error('Malformed timeline response: events must be an array.');
  }
  return raw.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Malformed timeline event at index ${index}.`);
    }
    const event = item as Record<string, unknown>;
    if (typeof event.id !== 'string' || typeof event.date !== 'string' || typeof event.title !== 'string') {
      throw new Error(`Malformed timeline event at index ${index}.`);
    }
    const type = TIMELINE_EVENT_TYPES.includes(event.type as TimelineEventType)
      ? (event.type as TimelineEventType)
      : 'Medical Report';
    return {
      id: event.id,
      date: event.date,
      title: event.title,
      type,
      description: typeof event.description === 'string' ? event.description : '',
      documentId: typeof event.documentId === 'string' ? event.documentId : '',
      metadata: typeof event.metadata === 'object' && event.metadata !== null ? (event.metadata as TimelineEvent['metadata']) : {},
    };
  });
}

// Real backend endpoint: GET {API_BASE}/api/timeline, derived from the
// documents actually stored by the FastAPI backend. No demo fallback —
// failures surface as errors to the caller.
export async function fetchTimeline(): Promise<TimelineEvent[]> {
  const response = await fetch(`${API_BASE}/api/timeline`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Timeline request failed (${response.status} ${response.statusText}).`);
  }
  const body = (await response.json()) as TimelineApiResponse;
  return normalizeTimelineEvents(body.events);
}

// --- Documents (real backend records) ---

export type BackendDocument = {
  document_id: string;
  title: string;
  filename: string;
  content_type: string;
  text: string;
  chunks: number;
  metadata: Record<string, unknown>;
  processed: boolean;
  created_at: string;
};

// Real backend endpoint: GET {API_BASE}/api/documents/{id}. Throws on 404 /
// network failure so callers can show honest states.
export async function fetchDocument(documentId: string): Promise<BackendDocument> {
  const response = await fetch(`${API_BASE}/api/documents/${encodeURIComponent(documentId)}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Document request failed (${response.status} ${response.statusText}).`);
  }
  return (await response.json()) as BackendDocument;
}
