"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  FileText,
  FlaskConical,
  ScanLine,
} from "lucide-react";
import DocumentCard from "@/components/DocumentCard";
import { DEMO_DOCUMENTS, type DemoDocument } from "@/lib/demo-data";
import { KIND_LABELS } from "@/lib/document-constants";

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

  // Filter and search documents
  const filteredDocuments = useMemo(() => {
    return DEMO_DOCUMENTS.filter((doc) => {
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
  }, [searchQuery, activeFilter]);

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

      {/* Documents grid */}
      {filteredDocuments.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
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
