"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Building2, FileText, RefreshCw } from "lucide-react";
import DocumentCard from "@/components/DocumentCard";
import type { DocumentViewModel } from "@/lib/document-constants";
import { fetchDocuments, fetchHospitalPatients, type HospitalAccessEntry } from "@/lib/api";
import { useSession } from "@/lib/session";

function toDocumentViewModel(
  document: Awaited<ReturnType<typeof fetchDocuments>>[number],
): DocumentViewModel {
  return {
    id: document.id,
    name: document.title || document.filename,
    kind: "report",
    date: document.created_at
      ? new Date(document.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        })
      : "Recent",
    pages: document.page_count ?? 0,
    status:
      document.processing_status === "failed"
        ? "failed"
        : document.processing_status === "processed"
          ? "processed"
          : "processing",
    flag: "normal",
  };
}

export default function HospitalPortalPage() {
  const { user, isLoading: sessionLoading } = useSession();
  const [documents, setDocuments] = useState<DocumentViewModel[]>([]);
  const [patients, setPatients] = useState<HospitalAccessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [authorizedPatients, records] = await Promise.all([
        fetchHospitalPatients(),
        fetchDocuments(),
      ]);
      setPatients(authorizedPatients);
      setDocuments(records.map(toDocumentViewModel));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patient records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const initialFetch = setTimeout(() => void loadDocuments(), 0);
    return () => clearTimeout(initialFetch);
  }, [loadDocuments, user]);

  if (sessionLoading || !user) {
    return (
      <div className="mx-auto flex min-h-64 max-w-6xl items-center justify-center">
        <p className="text-sm text-slate-500">Checking hospital access...</p>
      </div>
    );
  }

  if (user.role !== "hospital") {
    return (
      <div className="mx-auto flex min-h-64 max-w-6xl items-center justify-center">
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
          <h2 className="text-sm font-semibold text-amber-900">Hospital access is not authorized</h2>
          <p className="mt-1 text-sm text-amber-700">Sign in with a hospital account to view this portal.</p>
        </section>
      </div>
    );
  }

  const unauthorized = error?.includes("401") || error?.includes("403");

  return (
    <div className="animate-page-enter mx-auto w-full max-w-6xl space-y-6">
      <section className="rounded-2xl border border-white/20 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 p-6 shadow-lg backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Hospital Portal</h2>
            <p className="mt-2 text-sm text-slate-600">
              Authorized patient records for {user.name}.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Access is limited to records returned for this authenticated account.
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-lg">
          <div className="flex gap-4">
            <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
            <div>
              <h3 className="text-sm font-semibold text-red-900">
                {unauthorized ? "Hospital access is not authorized" : "Failed to load patient records"}
              </h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              {!unauthorized && (
                <button
                  type="button"
                  onClick={() => void loadDocuments()}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </button>
              )}
            </div>
          </div>
        </section>
      ) : loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white/60 p-6 text-center shadow-sm">
          <p className="text-sm text-slate-500">Loading patient records...</p>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold tracking-tight text-slate-900">Authorized patients</h3>
              <span className="text-sm text-slate-500">{patients.length}</span>
            </div>
            {patients.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No authorized patients yet.</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {patients.map((patient) => (
                  <div key={patient.patient_email} className="rounded-xl border border-slate-100 bg-white p-4">
                    <p className="text-sm font-bold text-slate-900">{patient.patient_email}</p>
                    <p className="mt-1 text-xs text-emerald-700">Access: {patient.status}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
          {documents.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white/60 p-8 text-center shadow-sm">
          <FileText className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">No authorized patient records are available.</p>
        </section>
      ) : (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-extrabold tracking-tight text-slate-900">Patient records</h3>
            <span className="text-sm text-slate-500">{documents.length} record{documents.length === 1 ? "" : "s"}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((document) => (
              <DocumentCard key={document.id} doc={document} />
            ))}
          </div>
        </section>
      )}
        </>
      )}
    </div>
  );
}