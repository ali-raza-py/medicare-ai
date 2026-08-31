"use client";

import Link from "next/link";
import type { DemoDocument } from "@/lib/demo-data";
import { KIND_ICONS, FLAG_LABELS, FLAG_STYLES } from "@/lib/document-constants";

// Honest processing-state chip, shown only when a document is not fully
// processed. 'failed' documents must be visibly different from healthy ones.
const STATUS_CHIP_STYLES: Record<string, string> = {
  failed:
    "bg-red-50 text-red-700 border-red-200",
  processing:
    "bg-amber-50 text-amber-700 border-amber-200",
  uploaded:
    "bg-slate-50 text-slate-600 border-slate-200",
};
const STATUS_CHIP_LABELS: Record<string, string> = {
  failed: "Extraction failed",
  processing: "Processing…",
  uploaded: "Queued",
};

export default function DocumentCard({ doc }: { doc: DemoDocument }) {
  const KindIcon = KIND_ICONS[doc.kind];
  const chipStyle = STATUS_CHIP_STYLES[doc.status];

  // Gradient based on document type
  const gradientClass = {
    lab: "from-blue-500/10 to-cyan-500/10",
    imaging: "from-purple-500/10 to-pink-500/10",
    report: "from-emerald-500/10 to-teal-500/10",
  }[doc.kind];

  return (
    <Link
      href={`/documents/${doc.id}`}
      className={`group block rounded-2xl border border-white/20 bg-gradient-to-br ${gradientClass} backdrop-blur-xl p-4 shadow-xl transition-all duration-300 hover:border-white/30 hover:shadow-2xl hover:scale-105`}
    >
      <div className="flex items-start gap-3">
        {/* Document type icon */}
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-slate-600 group-hover:bg-white/20 group-hover:text-teal-600 transition-all duration-300 backdrop-blur-sm border border-white/10">
          <KindIcon className="h-5 w-5" />
        </span>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
            {doc.name}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <p className="text-xs text-slate-600">
              {doc.date}
            </p>
            <span className="text-xs text-slate-400">·</span>
            <p className="text-xs text-slate-600">
              {doc.pages} page{doc.pages > 1 ? "s" : ""}
            </p>
            {chipStyle && (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${chipStyle}`}
              >
                {STATUS_CHIP_LABELS[doc.status]}
              </span>
            )}
          </div>
        </div>

        {/* Flag badge - glassmorphic */}
        <span
          className={`ml-2 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-sm ${FLAG_STYLES[doc.flag]} border border-white/20`}
        >
          {FLAG_LABELS[doc.flag]}
        </span>
      </div>
    </Link>
  );
}
