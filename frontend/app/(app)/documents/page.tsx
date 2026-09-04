"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  ChevronDown,
  FileText,
  AlertCircle,
  Loader2,
  FlaskConical,
  ScanLine,
} from "lucide-react";
import DocumentCard from "@/components/DocumentCard";
import { DEMO_DOCUMENTS, type DemoDocument } from "@/lib/demo-data";
import { KIND_LABELS } from "@/lib/document-constants";
import { deleteDocument, fetchDocuments, type BackendDocumentListItem } from "@/lib/api";

const FILTER_OPTIONS = [
  { value: "all", label: "All documents" },
  { value: "lab", label: "Lab results" },
  { value: "imaging", label: "Imaging" },
  { value: "report", label: "Reports" },
] as const;

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "lab" | "imaging" | "report"
  >("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [allDocs, setAllDocs] = useState<DemoDocument[]>(DEMO_DOCUMENTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch ONLY backend documents for authenticated users
  const fetchAndMerge = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch backend documents — errors are now thrown, not silenced
      const backendDocs = await fetchDocuments();

      // Convert backend docs to DemoDocument shape
      const docs: DemoDocument[] = backendDocs.map((bd) => ({
        id: bd.id,
        name: bd.title,
        kind: 'report',
        date: bd.created_at
          ? new Date(bd.created_at).toLocaleDateString('en-US', {
              month: 'short', day: '2-digit', year: 'numeric',
            })
          : 'Recent',
        pages: 1,
        status:
          bd.processing_status === 'failed'
            ? 'failed'
            : bd.processing_status === 'processed'
              ? 'processed'
              : 'processing',
        flag: 'normal',
      }));

      setAllDocs(docs);
    } catch (err) {
      // Real backend error — show it to the user
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch backend documents on mount and refetch on focus
  useEffect(() => {
    fetchAndMerge();
    window.addEventListener("medcare-uploads-changed", fetchAndMerge);
    window.addEventListener("storage", fetchAndMerge);
    // Refetch on window focus to pick up backend changes from other tabs
    window.addEventListener("focus", fetchAndMerge);
    return () => {
      window.removeEventListener("medcare-uploads-changed", fetchAndMerge);
      window.removeEventListener("storage", fetchAndMerge);
      window.removeEventListener("focus", fetchAndMerge);
    };
  }, [fetchAndMerge]);

  const handleDelete = async (documentId: string) => {
    if (!window.confirm("This will permanently delete this upload and all associated OCR/processed data. This action cannot be undone.")) return;
    setDeletingId(documentId);
    setError(null);
    try {
      await deleteDocument(documentId);
      await fetchAndMerge();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  // Filter and search documents
  const filteredDocuments = useMemo(() => {
    return allDocs.filter((doc) => {
      // Apply type filter
      if (activeFilter !== "all" && doc.kind !== activeFilter) {
        return false;
      }

      // Apply search filter (case-insensitive)
      if (
        searchQuery &&
        !doc.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [searchQuery, activeFilter, allDocs]);

  const activeFilterLabel = FILTER_OPTIONS.find(
    (opt) => opt.value === activeFilter
  )?.label;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Page header with glassmorphism */}
      <section className="rounded-2xl border border-white/20 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 backdrop-blur-xl p-6 shadow-lg">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Medical Documents
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Browse, search, and manage your medical document library with ease.
        </p>
      </section>

      {/* Search and filter controls - glassmorphic */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        {/* Search input with glassmorphism */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by document name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/40 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-500 backdrop-blur-md transition-all focus:border-white/40 focus:bg-white/60 focus:outline-none focus:ring-2 focus:ring-teal-400/50 shadow-lg"
          />
        </div>

        {/* Filter dropdown - glassmorphic */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/40 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white/50 transition-all backdrop-blur-md whitespace-nowrap shadow-lg hover:border-white/30"
          >
            {activeFilterLabel}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                filterOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown menu - glassmorphic */}
          {filterOpen && (
            <div className="absolute right-0 top-full z-10 mt-2 min-w-44 rounded-xl border border-white/20 bg-white/50 backdrop-blur-xl shadow-2xl overflow-hidden">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setActiveFilter(option.value);
                    setFilterOpen(false);
                  }}
                  className={`block w-full px-4 py-2.5 text-left text-sm transition-all ${
                    activeFilter === option.value
                      ? "bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-700 font-semibold border-l-2 border-teal-500"
                      : "text-slate-700 hover:bg-white/30"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Results info - glassmorphic counter */}
      <section className="flex items-center justify-between">
        <div className="rounded-xl border border-white/20 bg-gradient-to-r from-teal-500/5 to-cyan-500/5 backdrop-blur-md px-4 py-2 shadow-lg">
          <p className="text-sm font-medium text-slate-700">
            {filteredDocuments.length === 0 ? (
              <span className="text-slate-500">No documents found</span>
            ) : (
              <>
                Showing <span className="text-teal-600 font-bold">{filteredDocuments.length}</span>{" "}
                <span className="text-slate-600">
                  document{filteredDocuments.length !== 1 ? "s" : ""}
                </span>
              </>
            )}
          </p>
        </div>
      </section>

      {/* Loading state */}
      {loading ? (
        <section className="flex items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-slate-500/5 to-slate-400/5 backdrop-blur-xl p-12 shadow-lg">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          <span className="ml-3 text-sm text-slate-600">Loading documents...</span>
        </section>
      ) : error ? (
        /* Error state */
        <section className="rounded-2xl border border-red-200 bg-red-50 backdrop-blur-xl p-6 shadow-lg">
          <div className="flex gap-4">
            <AlertCircle className="h-6 w-6 shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">
                Failed to load documents
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>
              <button
                onClick={() => {
                  fetchAndMerge();
                }}
                className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </section>
      ) : filteredDocuments.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onDelete={handleDelete}
              isDeleting={deletingId === doc.id}
            />
          ))}
        </section>
      ) : (
        /* Empty state - glassmorphic */
        <section className="rounded-2xl border border-white/20 bg-gradient-to-br from-slate-500/5 to-slate-400/5 backdrop-blur-xl p-12 text-center shadow-lg">
          <div className="flex justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-slate-400 backdrop-blur-md border border-white/20">
              <FileText className="h-8 w-8" />
            </span>
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            No documents found
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            {searchQuery
              ? "Try adjusting your search terms or filters."
              : "No documents in your library yet. Upload one to get started."}
          </p>
        </section>
      )}
    </div>
  );
}
