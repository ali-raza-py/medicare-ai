"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  CalendarDays,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  DEMO_DOCUMENTS,
  DEMO_DOCUMENT_DETAILS,
  type DemoDocumentDetail,
} from "@/lib/demo-data";
import {
  getUploadedDocuments,
  uploadedToDemoDocument,
  type UploadedDocument,
} from "@/lib/uploaded-documents";
import {
  FLAG_LABELS,
  FLAG_STYLES,
  KIND_ICONS,
  KIND_LABELS,
} from "@/lib/document-constants";
import { fetchDocumentDetail, type BackendDocumentDetail } from "@/lib/api";

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const demoDoc = DEMO_DOCUMENTS.find((d) => d.id === id);
  const uploaded: UploadedDocument | undefined = demoDoc
    ? undefined
    : getUploadedDocuments().find((d) => d.id === id);

  // The backend record is the source of truth: ALWAYS fetch it for non-demo
  // documents, even when localStorage metadata exists. localStorage only
  // knows name/size/type — never the extracted text or processing status.
  const [backendDoc, setBackendDoc] = useState<BackendDocumentDetail | null>(null);
  const [loading, setLoading] = useState(!demoDoc && !!id);

  useEffect(() => {
    if (demoDoc || !id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchDocumentDetail(id).then((doc) => {
      if (cancelled) return;
      setBackendDoc(doc);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [demoDoc, id]);

  // Ignore a backend record that belongs to a previously-viewed document so
  // stale data is never flashed when navigating between detail pages.
  const visibleBackendDoc = backendDoc && backendDoc.id === id ? backendDoc : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
        <span className="ml-2 text-sm text-slate-600">Loading document...</span>
      </div>
    );
  }

  if (!demoDoc && !uploaded && !visibleBackendDoc) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-2xl border border-white/20 bg-white/40 backdrop-blur-xl p-12 text-center shadow-lg">
          <h2 className="text-xl font-semibold text-slate-900">
            Document not found
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            This document does not exist or was removed.
          </p>
          <Link
            href="/documents"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to documents
          </Link>
        </div>
      </div>
    );
  }

  const doc = demoDoc
    ?? (visibleBackendDoc
      ? {
          id: visibleBackendDoc.id,
          name: visibleBackendDoc.title || visibleBackendDoc.filename,
          kind: 'report' as const,
          date: visibleBackendDoc.created_at
            ? new Date(visibleBackendDoc.created_at).toLocaleDateString('en-US', {
                month: 'short', day: '2-digit', year: 'numeric',
              })
            : 'Recent',
          pages: visibleBackendDoc.page_count ?? 1,
          status: visibleBackendDoc.status as 'processed' | 'processing' | 'failed',
          flag: 'normal' as const,
        }
      : uploaded
        ? uploadedToDemoDocument(uploaded)
        : {
            // Not a demo document and no local entry; the "not found" branch
            // above already returned, so this fallback never renders.
            id: id ?? '',
            name: 'Unavailable document',
            kind: 'report' as const,
            date: 'Recent',
            pages: 1,
            status: 'processing' as const,
            flag: 'normal' as const,
          });

  // Real extracted text from the backend when it has the document;
  // localStorage-only entries (uploaded before backend integration) keep the
  // honest notice — no invented content.
  const detail: DemoDocumentDetail | undefined = demoDoc
    ? DEMO_DOCUMENT_DETAILS[doc.id]
    : visibleBackendDoc
      ? {
          summary: visibleBackendDoc.text || 'No extracted text available.',
          extractedAt: visibleBackendDoc.created_at
            ? new Date(visibleBackendDoc.created_at).toLocaleString()
            : 'just now',
        }
      : {
          summary:
            "Demo upload — AI extraction will run automatically once the backend integration is connected.",
          extractedAt: uploaded
            ? new Date(uploaded.uploadedAt).toLocaleString()
            : "just now",
        };

  const KindIcon = KIND_ICONS[doc.kind];

  const gradientClass = {
    lab: "from-blue-500/10 to-cyan-500/10",
    imaging: "from-purple-500/10 to-pink-500/10",
    report: "from-emerald-500/10 to-teal-500/10",
  }[doc.kind];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Back navigation */}
      <Link
        href="/documents"
        className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to documents
      </Link>

      {/* Document header */}
      <section
        className={`rounded-2xl border border-white/20 bg-gradient-to-br ${gradientClass} backdrop-blur-xl p-6 shadow-lg`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-slate-700 backdrop-blur-sm border border-white/20">
            <KindIcon className="h-6 w-6" />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              {doc.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {doc.date}
              </span>
              <span className="text-slate-400">·</span>
              <span>
                {doc.pages} page{doc.pages > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/40 px-2.5 py-1 text-xs font-medium text-slate-700 backdrop-blur-sm border border-white/20">
              {KIND_LABELS[doc.kind]}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-sm border border-white/20 ${FLAG_STYLES[doc.flag]}`}
            >
              {FLAG_LABELS[doc.flag]}
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Extracted findings */}
        <section className="rounded-2xl border border-white/20 bg-white/40 backdrop-blur-xl p-6 shadow-lg lg:col-span-3">
          <h3 className="text-sm font-semibold text-slate-900">
            AI-extracted findings
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {visibleBackendDoc
              ? "Real OCR extraction"
              : "Synthetic demo extraction"}{" "}
            · {detail?.extractedAt ?? "not yet processed"}
          </p>

          {visibleBackendDoc?.status === 'failed' && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Text extraction failed
                </p>
                <p className="mt-1 text-sm leading-relaxed text-red-700">
                  {visibleBackendDoc.error_message ||
                    "OCR could not extract any readable text from this document."}
                </p>
              </div>
            </div>
          )}

          {visibleBackendDoc && visibleBackendDoc.status !== 'failed' && !visibleBackendDoc.text && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-amber-600" />
              <p className="text-sm leading-relaxed text-amber-800">
                This document is still being processed. Extracted text will
                appear here once OCR completes.
              </p>
            </div>
          )}

          {detail?.summary && (
            <pre
              className="mt-4 max-h-[480px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/20 bg-white/60 p-4 font-sans text-sm leading-relaxed text-slate-700"
            >
              {detail.summary}
            </pre>
          )}

          {detail?.values && detail.values.length > 0 ? (
            <div className="mt-5 overflow-hidden rounded-xl border border-white/20">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/40 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Test</th>
                    <th className="px-4 py-2.5 font-semibold">Result</th>
                    <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">
                      Reference range
                    </th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {detail.values.map((v) => (
                    <tr key={v.label} className="hover:bg-white/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{v.label}</td>
                      <td className="px-4 py-3 text-slate-700">{v.value}</td>
                      <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">
                        {v.referenceRange}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium border border-white/20 ${FLAG_STYLES[v.flag]}`}
                        >
                          {FLAG_LABELS[v.flag]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {detail?.impression && (
            <div className="mt-5 rounded-xl border border-white/20 bg-gradient-to-r from-teal-500/5 to-cyan-500/5 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                Impression
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {detail.impression}
              </p>
            </div>
          )}

          <p className="mt-5 text-xs leading-relaxed text-slate-500">
            Demo data only — not medical advice. Always consult a qualified
            clinician about your results.
          </p>
        </section>

        {/* Metadata + actions */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-white/20 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 p-6 shadow-lg backdrop-blur-xl">
            <h3 className="text-sm font-semibold text-slate-900">Details</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-600">Document ID</dt>
                <dd className="font-medium text-slate-900">{doc.id}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-600">Type</dt>
                <dd className="font-medium text-slate-900">{KIND_LABELS[doc.kind]}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-600">Processing status</dt>
                <dd className="font-medium capitalize text-slate-900">{doc.status}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-600">Pages</dt>
                <dd className="font-medium text-slate-900">{doc.pages}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-white/20 bg-white/40 p-6 shadow-lg backdrop-blur-xl">
            <h3 className="text-sm font-semibold text-slate-900">
              Use this document
            </h3>
            <div className="mt-4 space-y-3">
              <Link
                href="/ask"
                className="group flex items-center gap-3 rounded-xl border border-white/20 bg-gradient-to-r from-teal-600/90 to-cyan-600/90 p-3.5 text-white shadow-md transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
              >
                <Sparkles className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">
                  Ask MediCare AI about this report
                </span>
              </Link>
              <Link
                href="/compare"
                className="group flex items-center gap-3 rounded-xl border border-white/20 bg-white/50 p-3.5 text-slate-900 shadow-md transition-all duration-300 hover:bg-white/60 hover:shadow-xl hover:scale-[1.02]"
              >
                <ArrowLeftRight className="h-5 w-5 shrink-0 text-teal-700" />
                <span className="text-sm font-medium">
                  Compare with an earlier report
                </span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
