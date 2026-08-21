import { SymptomAnalysisRequest, DiagnosticResponse } from '@/types/medical';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

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
