import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  Clock,
  FileText,
  Sparkles,
  Upload,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import RecentDocuments from "@/components/RecentDocuments";
import { DEMO_STATS, DEMO_TIMELINE } from "@/lib/demo-data";
import { displayNameFromEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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

  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const metadataName = [metadata.full_name, metadata.name].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0
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

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Documents"
          value={DEMO_STATS.totalDocuments}
          hint={`+${DEMO_STATS.documentsThisMonth} this month`}
          icon={FileText}
        />
        <StatCard
          label="Reports compared"
          value={DEMO_STATS.reportsCompared}
          hint="Using Compare / What Changed?"
          icon={ArrowLeftRight}
        />
        <StatCard
          label="Questions asked"
          value={DEMO_STATS.questionsAsked}
          hint="Answered with source evidence"
          icon={Sparkles}
        />
        <StatCard
          label="Last upload"
          value={DEMO_STATS.lastUpload}
          icon={Clock}
        />
      </section>

      {/* Recent documents + timeline preview */}
      <section className="grid gap-6 lg:grid-cols-5">
        <RecentDocuments />

        <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 p-5 shadow-lg backdrop-blur-xl lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Timeline preview</h3>
            <Link
              href="/timeline"
              className="flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
            >
              Full timeline <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ol className="mt-5 ml-1.5 space-y-6 border-l-2 border-white/20 pl-5">
            {DEMO_TIMELINE.slice(0, 4).map((event) => (
              <li key={event.id} className="relative">
                <span className="absolute -left-[27px] top-1 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-teal-600 to-cyan-600 ring-4 ring-white/30" />
                <p className="text-xs font-semibold text-teal-700">{event.date}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-900 font-medium">
                  {event.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Source: {event.sourceDocument}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
