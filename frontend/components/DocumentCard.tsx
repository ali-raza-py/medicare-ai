"use client";

import Link from "next/link";
import type { DemoDocument } from "@/lib/demo-data";
import { KIND_ICONS, FLAG_LABELS, FLAG_STYLES } from "@/lib/document-constants";

export default function DocumentCard({ doc }: { doc: DemoDocument }) {
  const KindIcon = KIND_ICONS[doc.kind];

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
