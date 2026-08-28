"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import DocumentCard from "@/components/DocumentCard";
import { DEMO_DOCUMENTS, type DemoDocument } from "@/lib/demo-data";
import { getAllDocuments } from "@/lib/uploaded-documents";

export default function RecentDocuments() {
  const [docs, setDocs] = useState<DemoDocument[]>(DEMO_DOCUMENTS);

  useEffect(() => {
    const update = () => setDocs(getAllDocuments());
    update();
    window.addEventListener("medcare-uploads-changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("medcare-uploads-changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-white/20 bg-white/40 shadow-lg backdrop-blur-xl lg:col-span-3">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">Recent documents</h3>
        <Link
          href="/documents"
          className="flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ul className="divide-y divide-white/10">
        {docs.slice(0, 5).map((doc) => (
          <li key={doc.id} className="px-5 py-3.5 hover:bg-white/20 transition-colors">
            <DocumentCard doc={doc} />
          </li>
        ))}
      </ul>
    </div>
  );
}
