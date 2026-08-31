import {
  DiagnosticResponse,
  MedicalDocumentRecord,
  MedicalAnswerRequest,
  MedicalAnswerResponse,
  MedicalComparisonRequest,
  MedicalComparisonResponse,
  SymptomAnalysisRequest,
} from '@/types/medical';

// In production (Vercel) the FastAPI backend is deployed on the same origin
// behind an /api/* rewrite, so an empty base yields relative URLs. Local dev
// still targets the standalone uvicorn server on port 8000.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000');

/**
 * Return the current Supabase access token for authenticated backend requests.
 * Returns null when Supabase isn't configured or the user isn't logged in.
 */
async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/** Build a headers object with optional auth token. */
async function authHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const headers: Record<string, string> = { ...extra };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function uploadAndProcessDocument(file: File): Promise<MedicalDocumentRecord> {
  const formData = new FormData();
  formData.append('file', file);

  const headers = await authHeaders();

  const uploadResponse = await fetch(`${API_BASE}/api/documents/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!uploadResponse.ok) {
    // Extract FastAPI detail message when present
    let detail = `HTTP ${uploadResponse.status}`;
    try {
      const body = await uploadResponse.json();
      if (body.detail) detail = body.detail;
    } catch {
      // non-JSON body — keep status code
    }
    throw new Error(`Document upload failed: ${detail}`);
  }

  const uploaded = await uploadResponse.json() as { document_id: string; title: string; filename: string };
  const processHeaders = await authHeaders({ 'Content-Type': 'application/json' });
  const processResponse = await fetch(`${API_BASE}/api/documents/process`, {
    method: 'POST',
    headers: processHeaders,
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
  const body: Record<string, unknown> = {
    question: payload.question,
    documents: payload.documents.map((d) => d.id),
  };
  if (payload.context && payload.context.length > 0) {
    body.context = payload.context.join('\n\n');
  }
  if (payload.history && payload.history.length > 0) {
    body.history = payload.history;
  }

  const askHeaders = await authHeaders({ 'Content-Type': 'application/json' });
  const response = await fetch(`${API_BASE}/api/medical-answer`, {
    method: 'POST',
    headers: askHeaders,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const parsed = await response.json();
      if (parsed.detail) detail = parsed.detail;
    } catch {
      // non-JSON error body
    }
    throw new Error(detail);
  }

  return (await response.json()) as MedicalAnswerResponse;
}

export async function compareReports(
  payload: MedicalComparisonRequest,
): Promise<MedicalComparisonResponse> {
  const compareHeaders = await authHeaders({ 'Content-Type': 'application/json' });
  const response = await fetch(`${API_BASE}/api/compare-reports`, {
    method: 'POST',
    headers: compareHeaders,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const parsed = await response.json();
      if (parsed.detail) detail = parsed.detail;
    } catch {
      // non-JSON error body
    }
    throw new Error(detail);
  }

  return (await response.json()) as MedicalComparisonResponse;
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
    headers: await authHeaders({ Accept: 'application/json' }),
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

// ── Document listing & detail (Supabase-aware) ─────────────────────────────────────

export type BackendDocumentListItem = {
  id: string;
  title: string;
  filename: string;
  document_type: string | null;
  processing_status: string;
  created_at: string | null;
  chunks: number;
};

// Normalize one record from GET /api/documents into the shape the UI uses.
// The backend returns bare detail records keyed by `document_id` /
// `processed` / `content_type`; wrapped or future responses may already carry
// the UI field names, so both are accepted.
function normalizeDocumentListItem(raw: unknown): BackendDocumentListItem | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const item = raw as Record<string, unknown>;
  const id =
    typeof item.id === 'string'
      ? item.id
      : typeof item.document_id === 'string'
        ? item.document_id
        : null;
  if (!id) return null;

  let processingStatus = 'processed';
  if (typeof item.processing_status === 'string') {
    processingStatus = item.processing_status;
  } else if (typeof item.processed === 'boolean') {
    processingStatus = item.processed ? 'processed' : 'processing';
  }

  return {
    id,
    title: typeof item.title === 'string' ? item.title : '',
    filename: typeof item.filename === 'string' ? item.filename : '',
    document_type:
      typeof item.document_type === 'string'
        ? item.document_type
        : typeof item.content_type === 'string'
          ? item.content_type
          : null,
    processing_status: processingStatus,
    created_at: typeof item.created_at === 'string' ? item.created_at : null,
    chunks: typeof item.chunks === 'number' ? item.chunks : 0,
  };
}

export async function fetchDocuments(): Promise<BackendDocumentListItem[]> {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/api/documents`, { headers });
    if (!response.ok) return [];
    const data: unknown = await response.json();
    // The backend returns a bare array of records; tolerate a
    // `{ documents: [...] }` wrapper as well.
    const records: unknown[] = Array.isArray(data)
      ? data
      : data !== null &&
          typeof data === 'object' &&
          Array.isArray((data as { documents?: unknown }).documents)
        ? (data as { documents: unknown[] }).documents
        : [];
    return records
      .map(normalizeDocumentListItem)
      .filter((item): item is BackendDocumentListItem => item !== null);
  } catch {
    return [];
  }
}

export type BackendDocumentDetail = BackendDocumentListItem & {
  text: string;
  metadata: Record<string, unknown>;
  processed: boolean;
  source: 'local' | 'supabase';
};

export async function fetchDocumentDetail(documentId: string): Promise<BackendDocumentDetail | null> {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}/api/documents/${documentId}`, { headers });
    if (!response.ok) return null;
    return (await response.json()) as BackendDocumentDetail;
  } catch {
    return null;
  }
}
