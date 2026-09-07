"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  CalendarDays,
  Loader2,
  Sparkles,
} from "lucide-react";
import { KIND_ICONS, KIND_LABELS } from "@/lib/document-constants";
import { fetchDocumentDetail, type BackendDocumentDetail } from "@/lib/api";

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [backendDoc, setBackendDoc] = useState<BackendDocumentDetail | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);

  const fetchDoc = useCallback(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDocumentDetail(id)
      .then((doc) => {
        if (cancelled) return;
        setBackendDoc(doc);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load document');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchDoc();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchDoc]);

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

  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-2xl border border-red-200 bg-red-50 backdrop-blur-xl p-8 shadow-lg">
          <div className="flex gap-4">
            <AlertTriangle className="h-6 w-6 shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-red-900">
                Failed to load document
              </h2>
              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => {
                    fetchDoc();
                  }}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
                <Link
                  href="/documents"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-300 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!visibleBackendDoc) {
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

  const doc = {
    id: visibleBackendDoc.id,
    name: visibleBackendDoc.title || visibleBackendDoc.filename,
    kind: 'report' as const,
    date: visibleBackendDoc.created_at
      ? new Date(visibleBackendDoc.created_at).toLocaleDateString('en-US', {
          month: 'short', day: '2-digit', year: 'numeric',
        })
      : 'Recent',
    pages: visibleBackendDoc.page_count ?? 0,
    status: visibleBackendDoc.status as 'processed' | 'processing' | 'failed',
    flag: 'normal' as const,
  };

  const extractedText = visibleBackendDoc.text || '';

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
                {doc.pages > 0
                  ? `${doc.pages} page${doc.pages > 1 ? "s" : ""}`
                  : "Page count unavailable"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/40 px-2.5 py-1 text-xs font-medium text-slate-700 backdrop-blur-sm border border-white/20">
              {KIND_LABELS[doc.kind]}
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
            Real OCR extraction · {visibleBackendDoc.created_at
              ? new Date(visibleBackendDoc.created_at).toLocaleString()
              : "not yet processed"}
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

          {extractedText && (
            <pre
              className="mt-4 max-h-[480px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/20 bg-white/60 p-4 font-sans text-sm leading-relaxed text-slate-700"
            >
              {extractedText}
            </pre>
          )}

          <p className="mt-5 text-xs leading-relaxed text-slate-500">
            Extracted text is shown for reference and is not medical advice.
            Always consult a qualified clinician about your results.
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
                <dd className="font-medium text-slate-900">
                  {doc.pages > 0 ? doc.pages : "Unavailable"}
                </dd>
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
