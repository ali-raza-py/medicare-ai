"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  MinusCircle,
  PlusCircle,
  RefreshCw,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import {
  compareReports,
  fetchDocuments,
  type BackendDocumentListItem,
} from "@/lib/api";
import type {
  MedicalComparisonResponse,
  MedicalComparisonRow,
} from "@/types/medical";

type DocsStatus = "loading" | "error" | "ready";

const CHANGE_STYLES: Record<
  MedicalComparisonRow["changeType"],
  { label: string; badge: string; icon: LucideIcon }
> = {
  added: {
    label: "Added",
    badge: "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20",
    icon: PlusCircle,
  },
  removed: {
    label: "Removed",
    badge: "bg-rose-500/10 text-rose-700 border border-rose-500/20",
    icon: MinusCircle,
  },
  updated: {
    label: "Updated",
    badge: "bg-amber-500/10 text-amber-700 border border-amber-500/20",
    icon: ArrowRight,
  },
  unchanged: {
    label: "Unchanged",
    badge: "bg-slate-500/10 text-slate-600 border border-slate-500/20",
    icon: CheckCircle2,
  },
};

function formatDocDate(isoDate: string | null): string {
  if (!isoDate) return "Unknown date";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export default function ComparePage() {
  const [docsStatus, setDocsStatus] = useState<DocsStatus>("loading");
  const [documents, setDocuments] = useState<BackendDocumentListItem[]>([]);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");

  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [result, setResult] = useState<MedicalComparisonResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDocuments()
      .then((docs) => {
        if (cancelled) return;
        setDocuments(docs);
        setDocsStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setDocsError(
          err instanceof Error ? err.message : "Could not load your documents."
        );
        setDocsStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const retryDocs = useCallback(() => {
    setDocsStatus("loading");
    setDocsError(null);
    setReloadKey((key) => key + 1);
  }, []);

  // Only documents with successfully extracted text can be compared.
  const processedDocs = documents.filter(
    (doc) => doc.processing_status === "processed"
  );

  const selectedLeft = documents.find((doc) => doc.id === leftId) ?? null;
  const selectedRight = documents.find((doc) => doc.id === rightId) ?? null;
  const canCompare = Boolean(
    leftId && rightId && !comparing &&
    selectedLeft?.processing_status === "processed" &&
    selectedRight?.processing_status === "processed"
  );

  const resetResult = () => {
    setResult(null);
    setCompareError(null);
  };

  const runComparison = useCallback(async () => {
    if (!leftId || !rightId || comparing) return;
    setComparing(true);
    setCompareError(null);
    setResult(null);
    try {
      const comparison = await compareReports({
        leftDocumentId: leftId,
        rightDocumentId: rightId,
      });
      setResult(comparison);
    } catch (err: unknown) {
      setCompareError(
        err instanceof Error ? err.message : "Comparison failed. Please try again."
      );
    } finally {
      setComparing(false);
    }
  }, [leftId, rightId, comparing]);            const leftOptions = processedDocs.filter((doc) => doc.id !== rightId);
  const rightOptions = processedDocs.filter((doc) => doc.id !== leftId);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Page header */}
      <section className="rounded-2xl border border-white/20 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 backdrop-blur-xl p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 text-teal-700 border border-white/20">
            <ArrowLeftRight className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Compare Reports
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Pick two reports to see documented differences side by side.
            </p>
          </div>
        </div>
      </section>

      {docsStatus === "loading" && (
        <section className="flex items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/40 backdrop-blur-xl p-12 shadow-lg">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-600">Loading your documents…</p>
        </section>
      )}

      {docsStatus === "error" && (
        <section className="rounded-2xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-xl p-8 text-center shadow-lg">
          <div className="flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
              <AlertTriangle className="h-7 w-7" aria-hidden="true" />
            </span>
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            Could not load your documents
          </h3>
          {docsError && <p className="mt-1 text-sm text-slate-600">{docsError}</p>}
          <button
            type="button"
            onClick={retryDocs}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-teal-500 hover:to-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        </section>
      )}

      {docsStatus === "ready" && documents.length === 0 && (
        <section className="rounded-2xl border border-white/20 bg-gradient-to-br from-slate-500/5 to-slate-400/5 backdrop-blur-xl p-12 text-center shadow-lg">
          <div className="flex justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-slate-400 backdrop-blur-md border border-white/20">
              <FileText className="h-8 w-8" aria-hidden="true" />
            </span>
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            No documents to compare yet
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Upload at least two reports to compare them here.
          </p>
          <Link
            href="/upload"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-teal-500 hover:to-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            <UploadCloud className="h-4 w-4" aria-hidden="true" />
            Upload documents
          </Link>
        </section>
      )}

      {docsStatus === "ready" &&
        documents.length > 0 &&
        processedDocs.length < 2 && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-xl p-8 text-center shadow-lg">
          <div className="flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <AlertTriangle className="h-7 w-7" aria-hidden="true" />
            </span>
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            Not enough processed documents
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            You need at least two documents with successfully extracted text to
            run a comparison. Currently {processedDocs.length} of{' '}
            {documents.length} document{documents.length !== 1 ? 's' : ''} ready.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Documents that are still processing or failed extraction cannot be
            compared.
          </p>
          <Link
            href="/upload"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-teal-500 hover:to-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            <UploadCloud className="h-4 w-4" aria-hidden="true" />
            Upload more documents
          </Link>
        </section>
      )}


      {docsStatus === "ready" && documents.length > 0 && (
        <>
          {/* Selection card */}
          <section className="rounded-2xl border border-white/20 bg-white/40 backdrop-blur-xl p-6 shadow-lg">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="report-a"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Report A (previous)
                </label>
                <select
                  id="report-a"
                  value={leftId}
                  onChange={(event) => {
                    setLeftId(event.target.value);
                    resetResult();
                  }}
                  disabled={comparing}
                  className="w-full rounded-xl border border-white/30 bg-white/70 px-4 py-2.5 text-sm text-slate-800 shadow-sm transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="" disabled>
                    Select a report…
                  </option>
                  {leftOptions.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title} · {formatDocDate(doc.created_at)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="report-b"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Report B (current)
                </label>
                <select
                  id="report-b"
                  value={rightId}
                  onChange={(event) => {
                    setRightId(event.target.value);
                    resetResult();
                  }}
                  disabled={comparing}
                  className="w-full rounded-xl border border-white/30 bg-white/70 px-4 py-2.5 text-sm text-slate-800 shadow-sm transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="" disabled>
                    Select a report…
                  </option>
                  {rightOptions.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title} · {formatDocDate(doc.created_at)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {processedDocs.length < 2 && documents.length >= 2 && (
              <p className="mt-3 text-sm text-amber-700">
                You need at least two processed documents to run a comparison.
                {processedDocs.length === 1 && ' One document is ready.'}
              </p>
            )}

            <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={runComparison}
                disabled={!canCompare}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-teal-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                {comparing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                )}
                {comparing ? "Comparing…" : "Compare Reports"}
              </button>
              {(!leftId || !rightId) && (
                <p className="text-sm text-slate-500">
                  Select both reports to enable comparison.
                </p>
              )}
            </div>

            {compareError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
                  aria-hidden="true"
                />
                <div className="flex-1">
                  <p className="text-sm text-rose-700">{compareError}</p>
                  <button
                    type="button"
                    onClick={runComparison}
                    disabled={comparing}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-500/10"
                  >
                    <RefreshCw className="h-3 w-3" aria-hidden="true" />
                    Try again
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Results */}
          {result && (
            <section className="space-y-4">
              <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 backdrop-blur-xl p-6 shadow-lg">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Summary
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-800">
                  {result.summary}
                </p>
                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    A: {selectedLeft?.title ?? "—"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    B: {selectedRight?.title ?? "—"}
                  </span>
                  {result.provider && <span>Provider: {result.provider}</span>}
                  {result.model && <span>Model: {result.model}</span>}
                </p>
              </div>

              {result.changes.length === 0 ? (
                <div className="rounded-2xl border border-white/20 bg-white/40 backdrop-blur-xl p-8 text-center shadow-lg">
                  <div className="flex justify-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-slate-900">
                    No differences were detected
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    The comparison completed but did not find any changes between
                    these two reports.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/40 backdrop-blur-xl shadow-lg">
                  <div className="border-b border-white/20 px-6 py-4">
                    <h3 className="text-sm font-semibold text-slate-700">
                      {result.changes.length} change
                      {result.changes.length !== 1 ? "s" : ""} detected
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/20 text-xs uppercase tracking-wide text-slate-500">
                          <th scope="col" className="px-6 py-3 font-semibold">
                            Change
                          </th>
                          <th scope="col" className="px-6 py-3 font-semibold">
                            Field
                          </th>
                          <th scope="col" className="px-6 py-3 font-semibold">
                            Previous value
                          </th>
                          <th scope="col" className="px-6 py-3 font-semibold">
                            Current value
                          </th>
                          <th scope="col" className="px-6 py-3 font-semibold">
                            Detail
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.changes.map((change, index) => {
                          const style =
                            CHANGE_STYLES[change.changeType] ??
                            CHANGE_STYLES.updated;
                          const ChangeIcon = style.icon;
                          return (
                            <tr
                              key={`${change.field}-${index}`}
                              className="border-b border-white/10 last:border-b-0 align-top transition-colors hover:bg-white/30"
                            >
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.badge}`}
                                >
                                  <ChangeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                  {style.label}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-medium text-slate-900">
                                {change.field}
                              </td>
                              <td className="px-6 py-4 text-slate-600">
                                {change.previousValue || "—"}
                              </td>
                              <td className="px-6 py-4 text-slate-600">
                                {change.currentValue || "—"}
                              </td>
                              <td className="px-6 py-4 text-slate-600">
                                {change.detail}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}


