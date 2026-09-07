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
import DashboardDocuments from "@/components/DashboardDocuments";
import { displayNameFromEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { API_BASE } from "@/lib/api-base";
import { formatShortDate } from "@/lib/format-date";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ApiTimelineEvent = {
  id: string;
  date: string;
  title: string;
  type: string;
  description: string;
  documentId: string;
};

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

  /* Fetch real timeline data from the backend if authenticated.
     Document stats / recent documents are fetched client-side via the
     existing fetchDocuments() helper (see DashboardDocuments). */
  let timelineEvents: ApiTimelineEvent[] = [];

  if (user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) {
      timelineEvents = await fetchServerTimeline(token);
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

  return (
    <div className="animate-page-enter mx-auto w-full max-w-7xl space-y-8">
      {/* Welcome + profile summary */}
      <section className="relative flex flex-col gap-6 overflow-hidden rounded-[2rem] bg-[#073f3c] p-7 text-white shadow-[0_18px_44px_rgba(7,63,60,0.16)] sm:p-9 lg:flex-row lg:items-center lg:justify-between">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[38px] border-[#2c8375]/40" />
        <div className="pointer-events-none absolute -bottom-32 right-40 h-56 w-56 rounded-full border-[28px] border-[#0b5a54]/80" />
        <div className="relative">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#80e6d0]">Your health workspace</p>
          <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.05em] sm:text-5xl">
            Welcome back, {firstName}
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-[#c3e1da]">
            Keep your records close, see the bigger picture, and prepare for your next conversation with your care team.
          </p>
        </div>

        <div className="relative flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm lg:min-w-[18rem]">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d8f3e9] text-sm font-extrabold text-[#123f3a] shadow-md">
            {initials}
          </span>
          <div className="text-sm">
            <p className="font-extrabold text-white">{displayName}</p>
            <p className="mt-0.5 text-[#c3e1da]">{email}</p>
            <p className="mt-2 inline-flex rounded-full bg-[#80e6d0]/15 px-2.5 py-1 text-xs font-bold text-[#a6f3e2]">
              Private workspace
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
              className={`group flex items-start gap-4 rounded-3xl border p-5 shadow-[0_10px_26px_rgba(31,65,55,0.06)] transition-all duration-300 ${
                cta.primary
                  ? "border-[#0b9b8e] bg-[#0b9b8e] text-white hover:-translate-y-1 hover:bg-[#087c72] hover:shadow-[0_18px_32px_rgba(11,155,142,0.2)]"
                  : "border-[#dfebe6] bg-white text-slate-900 hover:-translate-y-1 hover:border-[#9ed8ce] hover:shadow-[0_18px_32px_rgba(31,65,55,0.1)]"
              }`}
            >
              <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  cta.primary ? "bg-white/20" : "bg-[#dff7ef] text-[#0b9b8e]"
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

      {/* Document stats + recent documents — real backend data via the
          existing fetchDocuments() helper; timeline preview passed through. */}
      <DashboardDocuments
        timelineCount={timelineEvents.length}
        timelinePreview={
          /* Timeline preview — real data */
        <div className="rounded-3xl border border-[#bfe9dc] bg-[#eaf8f3] p-5 shadow-[0_10px_26px_rgba(31,65,55,0.06)] lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold tracking-tight text-slate-900">
              Timeline preview
            </h3>
            <Link
              href="/timeline"
              className="flex items-center gap-1 text-sm font-bold text-[#0b9b8e] transition-colors hover:text-[#087c72]"
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
            <ol className="mt-5 ml-1.5 space-y-6 border-l-2 border-[#bfe9dc] pl-5">
              {timelineEvents.slice(0, 4).map((event) => {
                const Icon = TIMELINE_ICONS[event.type] ?? ClipboardList;
                return (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[27px] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#0b9b8e] ring-4 ring-[#eaf8f3]">
                      <Icon className="h-2.5 w-2.5 text-white" />
                    </span>
                    <p className="text-xs font-bold text-[#0b9b8e]">
                      {formatShortDate(event.date)}
                    </p>
                    <p className="mt-1 text-sm font-bold leading-relaxed text-slate-900">
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
        }
      />
    </div>
  );
}
