'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { askMedicalQuestion, compareReports, uploadAndProcessDocument } from '@/lib/api';
import { MedicalDocumentRecord } from '@/types/medical';
import { createClient } from '@/lib/supabase/client';

type DocumentRecord = {
  id: string;
  title: string;
  type: string;
  date: string;
  status: 'Ready' | 'Needs review';
  summary: string;
};

type TimelineEvent = {
  id: string;
  date: string;
  title: string;
  details: string;
  badge: string;
};

type AnswerEntry = {
  id: string;
  question: string;
  answer: string;
  confidence: string;
  evidence: { source: string; snippet: string }[];
};

const initialDocuments: DocumentRecord[] = [
  {
    id: 'lab-jan',
    title: 'Annual Lab Report',
    type: 'PDF',
    date: '2025-01-12',
    status: 'Ready',
    summary: 'Routine CBC, renal profile, and liver function tests.',
  },
  {
    id: 'report-2024',
    title: 'Cardiology Clinic Note',
    type: 'PDF',
    date: '2024-11-20',
    status: 'Ready',
    summary: 'Past blood pressure trend and lifestyle recommendations.',
  },
  {
    id: 'img-2023',
    title: 'MRI Scan Summary',
    type: 'Image',
    date: '2023-09-09',
    status: 'Needs review',
    summary: 'Imaging summary uploaded from scanner output.',
  },
];

const timeline: TimelineEvent[] = [
  { id: 't1', date: '2025-01-12', title: 'Annual lab panel', details: 'CBC showed stable hemoglobin; creatinine within expected range.', badge: 'Lab' },
  { id: 't2', date: '2024-11-20', title: 'Cardiology follow-up', details: 'Blood pressure trend reviewed and lifestyle plan discussed.', badge: 'Clinic' },
  { id: 't3', date: '2023-09-09', title: 'MRI imaging note', details: 'Imaging summary captured and archived for review.', badge: 'Imaging' },
];

const initialComparisonRows = [
  { field: 'Blood pressure', oldValue: '128/82', newValue: '122/78', change: 'Improved' },
  { field: 'HbA1c', oldValue: '6.8%', newValue: '6.4%', change: 'Improved' },
  { field: 'Medication notes', oldValue: 'Metformin', newValue: 'Metformin + lifestyle follow-up', change: 'Updated' },
];

const starterAnswers: AnswerEntry[] = [
  {
    id: 'a1',
    question: 'What changed between the 2024 and 2025 reports?',
    answer:
      'The most notable change is an improvement in blood pressure and HbA1c readings. The newer lab report also includes a more complete medication review and lifestyle follow-up plan.',
    confidence: 'High confidence',
    evidence: [
      { source: 'Annual Lab Report.pdf', snippet: 'Blood pressure trend improved from 128/82 to 122/78, with HbA1c reduced from 6.8% to 6.4%.' },
      { source: 'Cardiology Clinic Note.pdf', snippet: 'Lifestyle plan was updated and medication plan reviewed alongside the patient follow-up.' },
    ],
  },
];

function classNames(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(' ');
}

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>(initialDocuments);
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState<AnswerEntry[]>(starterAnswers);
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [comparisonRows, setComparisonRows] = useState(initialComparisonRows);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    let supabase: ReturnType<typeof createClient>;

    try {
      supabase = createClient();
    } catch (authError) {
      Promise.resolve().then(() => setError(authError instanceof Error ? authError.message : 'Authentication is not configured.'));
      return () => { mounted = false; };
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted && !user) router.replace('/login');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted && (event === 'SIGNED_OUT' || !session)) router.replace('/login');
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) setError(signOutError.message);
      else router.replace('/login');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to sign out.');
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setError('');
    setIsUploading(true);
    try {
      const newDocs: DocumentRecord[] = await Promise.all(files.map(async (file) => {
        const document = await uploadAndProcessDocument(file);
        return { ...document, status: document.status ?? 'Ready' };
      }));
      setDocuments((prev) => [...newDocs, ...prev]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'The document could not be uploaded.');
    } finally {
      setIsUploading(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAskQuestion = async () => {
    const trimmed = question.trim();
    if (!trimmed) return;

    setError('');
    setIsAsking(true);
    try {
      const response = await askMedicalQuestion({ question: trimmed, documents: documents as MedicalDocumentRecord[] });
      setAnswers((prev) => [{
        id: crypto.randomUUID(),
        question: trimmed,
        answer: response.answer,
        confidence: `${response.confidence} confidence`,
        evidence: response.evidence.map((entry) => ({ source: entry.documentName, snippet: entry.snippet })),
      }, ...prev]);
      setQuestion('');
    } catch (questionError) {
      setError(questionError instanceof Error ? questionError.message : 'The question could not be answered.');
    } finally {
      setIsAsking(false);
    }
  };

  const handleCompareReports = async () => {
    setError('');
    setIsComparing(true);
    try {
      const response = await compareReports({
        leftReport: 'Blood pressure 128/82, HbA1c 6.8%, medication: Metformin',
        rightReport: 'Blood pressure 122/78, HbA1c 6.4%, medication: Metformin and lifestyle follow-up',
      });
      setComparisonRows(response.changes.map((row) => ({
        field: row.field,
        oldValue: row.previousValue,
        newValue: row.currentValue,
        change: row.changeType === 'updated' ? 'Updated' : row.changeType,
      })));
    } catch (comparisonError) {
      setError(comparisonError instanceof Error ? comparisonError.message : 'The reports could not be compared.');
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">MediCare AI</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Patient records dashboard</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 self-start">
              <div className="flex items-center gap-3 rounded-full bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Safe, evidence-grounded workflow
              </div>
              <button type="button" onClick={handleSignOut} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900">
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Medical document library</h2>
                  <p className="text-sm text-slate-500">Upload PDFs and images to build a searchable patient timeline.</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  {isUploading ? 'Processing...' : 'Upload files'}
                </button>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.tiff" className="hidden" onChange={handleFileUpload} />
              </div>

              {error && <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="rounded-full bg-teal-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-700">{doc.type}</span>
                      <span className={classNames('rounded-full px-2 py-1 text-[10px] font-semibold', doc.status === 'Ready' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                        {doc.status}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">{doc.title}</h3>
                    <p className="mt-2 text-sm text-slate-500">{doc.summary}</p>
                    <div className="mt-4 text-xs text-slate-400">{doc.date}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-900">Medical timeline</h2>
                <p className="text-sm text-slate-500">Chronological view of the patient record set.</p>
              </div>

              <div className="space-y-4">
                {timeline.map((entry) => (
                  <div key={entry.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col items-center justify-start">
                      <span className="mt-1 h-3 w-3 rounded-full bg-teal-500" />
                      <span className="mt-2 h-full w-px bg-slate-200" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-900">{entry.title}</span>
                        <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">{entry.badge}</span>
                      </div>
                      <p className="text-sm text-slate-500">{entry.details}</p>
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{entry.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900">Ask my documents</h2>
                <p className="text-sm text-slate-500">Ground answers strictly in uploaded evidence.</p>
              </div>

              <div className="space-y-3">
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  rows={4}
                  placeholder="Ask about blood pressure, lab change, medications, or follow-up notes..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 outline-none ring-0 transition focus:border-teal-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleAskQuestion}
                  className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
                >
                  {isAsking ? 'Searching records...' : 'Ask MediCare AI'}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900">Compare reports</h2>
                <p className="text-sm text-slate-500">What changed between the earlier and latest report.</p>
              </div>

              <button
                type="button"
                onClick={handleCompareReports}
                className="mb-3 w-full rounded-xl border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
              >
                {isComparing ? 'Comparing...' : 'Refresh comparison'}
              </button>

              <div className="space-y-3">
                {comparisonRows.map((row) => (
                  <div key={row.field} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-700">{row.field}</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700">{row.change}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span>{row.oldValue}</span>
                      <span className="text-slate-300">→</span>
                      <span className="font-medium text-slate-800">{row.newValue}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </main>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">Evidence-grounded answers</h2>
            <p className="text-sm text-slate-500">Every answer remains tied to the uploaded record set.</p>
          </div>

          <div className="space-y-4">
            {answers.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">Q: {item.question}</p>
                  <span className="rounded-full bg-teal-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-teal-700">{item.confidence}</span>
                </div>
                <p className="text-sm leading-6 text-slate-700">A: {item.answer}</p>

                <div className="mt-4 space-y-2 border-t border-slate-200 pt-3">
                  {item.evidence.map((entry) => (
                    <div key={`${item.id}-${entry.source}`} className="rounded-xl bg-white p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{entry.source}</p>
                      <p className="text-sm text-slate-700">{entry.snippet}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
