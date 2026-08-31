export interface SymptomAnalysisRequest {
  patientId?: string;
  symptoms: string;
  age?: number;
  gender?: string;
}

export interface DiagnosticResponse {
  condition: string;
  confidenceScore: number;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  recommendations: string[];
  suggestedSpecialist?: string;
}

export interface PatientVitals {
  heartRate: number;
  bloodPressure: string;
  oxygenSaturation: number;
  updatedAt: string;
}

export interface MedicalDocumentRecord {
  id: string;
  title: string;
  type: string;
  date: string;
  status?: 'Ready' | 'Needs review' | 'Extraction failed';
  summary: string;
  content?: string;
}

export interface MedicalEvidence {
  documentName: string;
  section: string;
  sourceId: string;
  snippet: string;
  score: number;
}

export interface MedicalAnswerRequest {
  question: string;
  documents: MedicalDocumentRecord[];
  context?: string[];
  history?: { role: 'user' | 'assistant'; content: string }[];
}

export interface MedicalAnswerResponse {
  answer: string;
  evidence: MedicalEvidence[];
  confidence: 'High' | 'Medium' | 'Low';
  sourceCount: number;
  provider?: string;
  model?: string;
}

export interface MedicalComparisonRow {
  field: string;
  previousValue: string;
  currentValue: string;
  changeType: 'added' | 'removed' | 'updated' | 'unchanged';
  detail: string;
}

export interface MedicalComparisonRequest {
  leftReport: string;
  rightReport: string;
}

export interface MedicalComparisonResponse {
  summary: string;
  changes: MedicalComparisonRow[];
  provider?: string;
  model?: string;
}
