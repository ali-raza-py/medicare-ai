"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, FileText, Upload } from "lucide-react";
import StatCard from "@/components/StatCard";
import { fetchDocuments, type BackendDocumentListItem } from "@/lib/api";
import {
  formatDocDate,
  formatShortDate,
  isThisMonth,
} from "@/lib/format-date";

/**
 * Client-side dashboard document data.
 *
 * Uses the existing authenticated `fetchDocuments()` helper — the exact same
 * backend call the Documents page uses — so the Dashboard always reflects the
 * real backend documents. `timelinePreview` is the server-rendered timeline
 * panel passed through from the page, keeping a single documents fetch.
 */
export default function DashboardDocuments({
  timelineCount,
  timelinePreview,
}: {
  timelineCount: number;
  timelinePreview: React.ReactNode;
}) {
  const [documents, setDocuments] = useState<BackendDocumentListItem[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // Truthy until the first backend response arrives (or fails).
  const loading = documents === null && error === null;

  const load = useCallback(async () => {
    try {
      // Existing authenticated helper — same path as the Documents page.
      const docs = await fetchDocuments();
      setError(null);
      setDocuments(docs);
    } catch (err) {
      // Surface real backend/network errors instead of faking "no documents".
      setError(
        err instanceof Error ? err.message : "Failed to load documents",
      );
    }
  }, []);

  useEffect(() => {
    // Initial fetch is deferred to a timer callback (setState never runs
    // synchronously in the effect body); refetch on upload/focus events.
    const initialFetch = setTimeout(load, 0);
    window.addEventListener("medcare-uploads-changed", load);
    window.addEventListener("focus", load);
    return () => {
      clearTimeout(initialFetch);
      window.removeEventListener("medcare-uploads-changed", load);
      window.removeEventListener("focus", load);
    };
  }, [load]);

  /* Honest stats derived from the real backend response */
  const docs = documents ?? [];
  const processedCount = docs.filter(
    (d) => d.processing_status === "processed",
  ).length;
  const docsThisMonth = docs.filter((d) => isThisMonth(d.created_at)).length;
  const recentDocs = [...docs]
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 5);
  const lastUpload =
    recentDocs.find((doc) => doc.created_at)?.created_at ?? null;

  return (
    <>
      {/* Stats — real data only */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Documents"
          value={loading ? "…" : error ? "—" : docs.length}
          hint={
            error
              ? "Could not load documents"
              : loading
                ? undefined
                : docsThisMonth > 0
                  ? `+${docsThisMonth} this month`
                  : "All processed"
          }
          icon={FileText}
        />
        <StatCard
          label="Timeline events"
          value={timelineCount}
          hint="From uploaded records"
          icon={Clock}
        />
        <StatCard
          label="Last upload"
          value={
            loading
              ? "…"
              : error
                ? "—"
                : lastUpload
                  ? formatShortDate(lastUpload)
                  : "None yet"
          }
          icon={Clock}
        />
        <StatCard
          label="Processing status"
          value={
            loading
              ? "…"
              : error
                ? "—"
                : docs.length === 0
                  ? "No documents"
                  : `${processedCount}/${docs.length}`
          }
          hint={
            error
              ? "Could not load documents"
              : loading
                ? undefined
                : docs.length === 0
                  ? "Upload to get started"
                  : docs.length > processedCount
                    ? `${docs.length - processedCount} pending`
                    : "All processed"
          }
          icon={FileText}
        />
      </section>

      {/* Recent documents + timeline preview */}
      <section className="grid gap-6 lg:grid-cols-5">
        {/* Recent documents — real data */}
        <div className="rounded-2xl border border-white/20 bg-white/40 shadow-lg backdrop-blur-xl lg:col-span-3">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Recent documents
            </h3>
            <Link
              href="/documents"
              className="flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {error ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : loading ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-slate-500">Loading documents…</p>
            </div>
          ) : recentDocs.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">
                No documents yet. Upload your first report to get started.
              </p>
              <Link
                href="/upload"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload document
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-white/10">
              {recentDocs.map((doc) => {
                const isProcessed = doc.processing_status === "processed";
                const isFailed = doc.processing_status === "failed";
                return (
                  <li
                    key={doc.id}
                    className="px-5 py-3.5 hover:bg-white/20 transition-colors"
                  >
                    <Link
                      href={`/documents/${doc.id}`}
                      className="group block"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                          <FileText className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900 group-hover:text-teal-700 transition-colors">
                            {doc.title || doc.filename}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {formatDocDate(doc.created_at)}
                          </p>
                        </div>
                        {!isProcessed && (
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                              isFailed
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {isFailed ? "Failed" : "Processing…"}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Timeline preview — server-rendered panel passed from the page */}
        {timelinePreview}
      </section>
    </>
  );
}