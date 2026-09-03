import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  Clock,
  FileText,
  FlaskConical,
  Pill,
  ScanLine,
  Stethoscope,
  ClipboardList,
  Upload,
  Sparkles,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import { displayNameFromEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { API_BASE } from "@/lib/api-base";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ApiDocument = {
  id: string;
  title: string;
  filename: string;
  content_type?: string;
  processing_status?: string;
  created_at?: string | null;
  chunks?: number;
  status?: string;
};

type ApiTimelineEvent = {
  id: string;
  date: string;
  title: string;
  type: string;
  description: string;
  documentId: string;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatShortDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatDocDate(isoDate: string | null): string {
  if (!isoDate) return "Unknown date";
  return formatShortDate(isoDate);
}

function isThisMonth(isoDate: string | null): boolean {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth()
  );
}

const TIMELINE_ICONS: Record<string, typeof FileText> = {
  "Lab Result": FlaskConical,
  Diagnosis: Stethoscope,
  Medication: Pill,
  Imaging: ScanLine,
  "Doctor Visit": Stethoscope,
  "Medical Report": ClipboardList,
};

/* ------------------------------------------------------------------ */
/*  Server-side data fetching                                          */
/* ------------------------------------------------------------------ */

async function fetchServerDocuments(
  accessToken: string,
): Promise<ApiDocument[]> {
  try {
    const res = await fetch(`${API_BASE}/api/documents`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    const records: unknown[] = Array.isArray(data)
      ? data
      : data !== null &&
          typeof data === "object" &&
          Array.isArray((data as { documents?: unknown }).documents)
        ? (data as { documents: unknown[] }).documents
        : [];
    return records.filter(
      (r): r is ApiDocument =>
        typeof r === "object" && r !== null && typeof (r as Record<string, unknown>).id === "string",
    );
  } catch {
    return [];
  }
}

async function fetchServerTimeline(
  accessToken: string,
): Promise<ApiTimelineEvent[]> {
  try {
    const res = await fetch(`${API_BASE}/api/timeline`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body: unknown = await res.json();
    const events = (body as { events?: unknown })?.events;
    if (!Array.isArray(events)) return [];
    return events.filter(
      (e): e is ApiTimelineEvent =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as Record<string, unknown>).id === "string" &&
        typeof (e as Record<string, unknown>).date === "string" &&
        typeof (e as Record<string, unknown>).title === "string",
    );
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const CTAS = [
  {
    href: "/upload",
    title: "Upload a document",
    description: "Add lab reports, imaging, or prescriptions to your library.",
    icon: Upload,
    primary: true,
  },
  {
    href: "/ask",
    title: "Ask MediCare AI",
    description: "Ask questions and get answers grounded in your records.",
    icon: Sparkles,
    primary: false,
  },
  {
    href: "/compare",
    title: "Compare reports",
    description: "See what changed between two reports, with evidence.",
    icon: ArrowLeftRight,
    primary: false,
  },
] as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* Fetch real data from the backend if authenticated */
  let documents: ApiDocument[] = [];
  let timelineEvents: ApiTimelineEvent[] = [];

  if (user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) {
      [documents, timelineEvents] = await Promise.all([
        fetchServerDocuments(token),
        fetchServerTimeline(token),
      ]);
    }
  }

  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const metadataName = [metadata.full_name, metadata.name].find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );
  const email = user?.email ?? "";
  const displayName =
    metadataName?.trim() || (email ? displayNameFromEmail(email) : "there");
  const firstName = displayName.split(" ")[0] || "there";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "MC";

  /* Honest stats computed from real backend data */
  const processedDocs = documents.filter(
    (d) =>
      d.processing_status === "processed" || d.status === "processed",
  );
  const totalDocuments = processedDocs.length;
  const docsThisMonth = processedDocs.filter((d) =>
    isThisMonth(d.created_at ?? null),
  ).length;
  const recentDocs = [...documents]
    .sort((a, b) => {
      const dateA = new Date(a.created_at ?? 0).getTime();
      const dateB = new Date(b.created_at ?? 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 5);
  const lastUpload = documents.length > 0 ? recentDocs[0]?.created_at : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Welcome + profile summary */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Welcome back, {firstName}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Here is an overview of your health records.
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-white/20 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 p-4 shadow-lg backdrop-blur-xl">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 text-sm font-semibold text-white shadow-md">
            {initials}
          </span>
          <div className="text-sm">
            <p className="font-semibold text-slate-900">{displayName}</p>
            <p className="mt-0.5 text-slate-600">{email}</p>
            <p className="mt-1 inline-flex rounded-full bg-white/40 px-2 py-0.5 text-xs font-medium text-slate-700 backdrop-blur-sm border border-white/20">
              Signed in with Supabase
            </p>
          </div>
        </div>
      </section>

      {/* Primary actions */}
      <section className="grid gap-4 sm:grid-cols-3">
        {CTAS.map((cta) => {
          const Icon = cta.icon;
          return (
            <Link
              key={cta.href}
              href={cta.href}
              className={`group flex items-start gap-4 rounded-2xl border p-5 shadow-lg transition-all duration-300 backdrop-blur-xl ${
                cta.primary
                  ? "border-white/20 bg-gradient-to-br from-teal-600/90 to-cyan-600/90 text-white hover:from-teal-600 hover:to-cyan-600 hover:shadow-2xl hover:scale-105"
                  : "border-white/20 bg-white/40 text-slate-900 hover:bg-white/50 hover:border-white/30"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  cta.primary ? "bg-white/20" : "bg-teal-100/60 text-teal-700"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium">{cta.title}</p>
                <p
                  className={`mt-1 text-sm leading-relaxed ${
                    cta.primary ? "text-teal-50" : "text-slate-600"
                  }`}
                >
                  {cta.description}
                </p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 self-center opacity-50 transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </section>

      {/* Stats — real data only */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Documents"
          value={totalDocuments}
          hint={
            docsThisMonth > 0
              ? `+${docsThisMonth} this month`
              : "All processed"
          }
          icon={FileText}
        />
        <StatCard
          label="Timeline events"
          value={timelineEvents.length}
          hint="From uploaded records"
          icon={Clock}
        />
        <StatCard
          label="Last upload"
          value={lastUpload ? formatShortDate(lastUpload) : "None yet"}
          icon={Clock}
        />
        <StatCard
          label="Processing status"
          value={
            documents.length === 0
              ? "No documents"
              : `${processedDocs.length}/${documents.length}`
          }
          hint={
            documents.length > 0
              ? documents.length > processedDocs.length
                ? `${documents.length - processedDocs.length} pending`
                : "All processed"
              : "Upload to get started"
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
          {recentDocs.length === 0 ? (
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
                const isProcessed =
                  doc.processing_status === "processed" ||
                  doc.status === "processed";
                const isFailed =
                  doc.processing_status === "failed" ||
                  doc.status === "failed";
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
                            {formatDocDate(doc.created_at ?? null)}
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

        {/* Timeline preview — real data */}
        <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 p-5 shadow-lg backdrop-blur-xl lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Timeline preview
            </h3>
            <Link
              href="/timeline"
              className="flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
            >
              Full timeline <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {timelineEvents.length === 0 ? (
            <div className="mt-5 text-center">
              <Clock className="mx-auto h-8 w-8 text-teal-300/50" />
              <p className="mt-2 text-sm text-teal-700/60">
                No timeline events yet. Upload documents to build your health
                timeline.
              </p>
            </div>
          ) : (
            <ol className="mt-5 ml-1.5 space-y-6 border-l-2 border-white/20 pl-5">
              {timelineEvents.slice(0, 4).map((event) => {
                const Icon = TIMELINE_ICONS[event.type] ?? ClipboardList;
                return (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[27px] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-cyan-600 ring-4 ring-white/30">
                      <Icon className="h-2.5 w-2.5 text-white" />
                    </span>
                    <p className="text-xs font-semibold text-teal-700">
                      {formatShortDate(event.date)}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-900 font-medium">
                      {event.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {event.type}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}
