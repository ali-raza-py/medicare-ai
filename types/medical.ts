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
