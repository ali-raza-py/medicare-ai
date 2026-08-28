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
  status: "processed" | "processing";
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
