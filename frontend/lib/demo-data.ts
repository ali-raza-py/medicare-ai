// Synthetic, de-identified demo data only — never real patient data.
// Replaced later by real API responses once the backend contracts are stable.

export type DemoPatient = {
  name: string;
  initials: string;
  ageYears: number;
  bloodGroup: string;
  patientId: string;
};

export type DemoDocument = {
  id: string;
  name: string;
  kind: "lab" | "imaging" | "report";
  date: string;
  pages: number;
  status: "processed" | "processing" | "failed";
  flag: "normal" | "attention" | "high";
};

export type DemoTimelineEvent = {
  id: string;
  date: string;
  title: string;
  sourceDocument: string;
};

export const DEMO_PATIENT: DemoPatient = {
  name: "Ayesha Khan",
  initials: "AK",
  ageYears: 34,
  bloodGroup: "O+",
  patientId: "MC-DEMO-0142",
};

export const DEMO_DOCUMENTS: DemoDocument[] = [
  { id: "doc-001", name: "Complete Blood Count (CBC)", kind: "lab", date: "Aug 24, 2026", pages: 2, status: "processed", flag: "normal" },
  { id: "doc-002", name: "Lipid Panel", kind: "lab", date: "Aug 24, 2026", pages: 1, status: "processed", flag: "attention" },
  { id: "doc-003", name: "HbA1c Report", kind: "lab", date: "Jul 12, 2026", pages: 1, status: "processed", flag: "high" },
  { id: "doc-004", name: "Chest X-Ray Report", kind: "imaging", date: "Jun 30, 2026", pages: 3, status: "processed", flag: "normal" },
  { id: "doc-005", name: "Abdominal Ultrasound", kind: "imaging", date: "May 18, 2026", pages: 4, status: "processed", flag: "normal" },
  { id: "doc-006", name: "Vitamin D, 25-Hydroxy", kind: "lab", date: "Apr 05, 2026", pages: 1, status: "processed", flag: "attention" },
];

export type DemoDocumentValue = {
  label: string;
  value: string;
  referenceRange: string;
  flag: DemoDocument["flag"];
};

export type DemoDocumentDetail = {
  summary: string;
  extractedAt: string;
  values?: DemoDocumentValue[];
  impression?: string;
};

export const DEMO_DOCUMENT_DETAILS: Record<string, DemoDocumentDetail> = {
  "doc-001": {
    summary:
      "Routine complete blood count. All measured values fall within the expected reference ranges for the patient's age and sex.",
    extractedAt: "Aug 24, 2026 · 10:12 AM",
    values: [
      { label: "Hemoglobin", value: "13.1 g/dL", referenceRange: "12.0 – 15.5 g/dL", flag: "normal" },
      { label: "WBC count", value: "7.2 ×10³/µL", referenceRange: "4.5 – 11.0 ×10³/µL", flag: "normal" },
      { label: "Platelets", value: "265 ×10³/µL", referenceRange: "150 – 400 ×10³/µL", flag: "normal" },
      { label: "Hematocrit", value: "39.8%", referenceRange: "34.9 – 44.5%", flag: "normal" },
    ],
  },
  "doc-002": {
    summary:
      "Fasting lipid panel. LDL cholesterol is elevated compared with the previous panel; HDL remains at the lower edge of the range.",
    extractedAt: "Aug 24, 2026 · 10:15 AM",
    values: [
      { label: "Total cholesterol", value: "221 mg/dL", referenceRange: "< 200 mg/dL", flag: "attention" },
      { label: "LDL cholesterol", value: "148 mg/dL", referenceRange: "< 100 mg/dL", flag: "high" },
      { label: "HDL cholesterol", value: "44 mg/dL", referenceRange: "> 50 mg/dL", flag: "attention" },
      { label: "Triglycerides", value: "175 mg/dL", referenceRange: "< 150 mg/dL", flag: "attention" },
    ],
  },
  "doc-003": {
    summary:
      "Glycated hemoglobin report. HbA1c has crossed the diabetic threshold for the first time; confirmatory testing and clinical review are suggested.",
    extractedAt: "Jul 12, 2026 · 04:40 PM",
    values: [
      { label: "HbA1c", value: "6.9%", referenceRange: "< 5.7%", flag: "high" },
      { label: "Estimated avg. glucose", value: "151 mg/dL", referenceRange: "< 117 mg/dL", flag: "high" },
    ],
  },
  "doc-004": {
    summary:
      "Radiologist report for a posteroanterior chest radiograph. No acute cardiopulmonary abnormality was identified.",
    extractedAt: "Jun 30, 2026 · 09:05 AM",
    impression:
      "No focal consolidation, pleural effusion, or pneumothorax. Cardiac silhouette within normal limits. Clear lungs bilaterally.",
  },
  "doc-005": {
    summary:
      "Abdominal ultrasound report. Mild hepatic steatosis (fatty liver) noted; remainder of the examined organs appear unremarkable.",
    extractedAt: "May 18, 2026 · 11:30 AM",
    impression:
      "Mild diffuse increase in hepatic echogenicity consistent with Grade I fatty infiltration. Gallbladder, pancreas, spleen, and kidneys appear normal.",
  },
  "doc-006": {
    summary:
      "Vitamin D (25-hydroxy) assay. Result indicates insufficiency; supplementation may be discussed with the treating clinician.",
    extractedAt: "Apr 05, 2026 · 02:20 PM",
    values: [
      { label: "Vitamin D, 25-OH", value: "18 ng/mL", referenceRange: "30 – 100 ng/mL", flag: "attention" },
    ],
  },
};

export const DEMO_TIMELINE: DemoTimelineEvent[] = [
  { id: "evt-001", date: "Aug 24, 2026", title: "Lipid panel shows elevated LDL vs previous test", sourceDocument: "Lipid Panel" },
  { id: "evt-002", date: "Jul 12, 2026", title: "HbA1c crossed above 6.5% for the first time", sourceDocument: "HbA1c Report" },
  { id: "evt-003", date: "Jun 30, 2026", title: "Chest X-Ray reported clear", sourceDocument: "Chest X-Ray Report" },
  { id: "evt-004", date: "May 18, 2026", title: "Ultrasound noted mild fatty liver", sourceDocument: "Abdominal Ultrasound" },
  { id: "evt-005", date: "Apr 05, 2026", title: "Vitamin D deficiency detected", sourceDocument: "Vitamin D, 25-Hydroxy" },
];

export const DEMO_STATS = {
  totalDocuments: 12,
  documentsThisMonth: 3,
  reportsCompared: 4,
  questionsAsked: 9,
  lastUpload: "Aug 24, 2026",
};
