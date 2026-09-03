"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  FileText,
  FlaskConical,
  Loader2,
  Pill,
  RefreshCw,
  ScanLine,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import {
  fetchTimeline,
  TimelineHttpError,
  type TimelineEvent,
  type TimelineEventType,
} from "@/lib/api";

const TYPE_ICONS: Record<TimelineEventType, LucideIcon> = {
  "Lab Result": FlaskConical,
  Diagnosis: Stethoscope,
  Medication: Pill,
  Imaging: ScanLine,
  "Doctor Visit": Stethoscope,
  "Medical Report": ClipboardList,
};

const TYPE_STYLES: Record<TimelineEventType, string> = {
  "Lab Result": "bg-blue-500/10 text-blue-700 border border-blue-500/20",
  Diagnosis: "bg-amber-500/10 text-amber-700 border border-amber-500/20",
  Medication: "bg-violet-500/10 text-violet-700 border border-violet-500/20",
  Imaging: "bg-purple-500/10 text-purple-700 border border-purple-500/20",
  "Doctor Visit": "bg-cyan-500/10 text-cyan-700 border border-cyan-500/20",
  "Medical Report": "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20",
};

type Status =
  | "loading"
  | "ready"
  | "unauthorized"
  | "not-found"
  | "error";

function formatDay(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatTime(isoDate: string): string | null {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function TimelinePage() {
  const [status, setStatus] = useState<Status>("loading");
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchTimeline()
      .then((result) => {
        if (cancelled) return;
        setEvents(result);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof TimelineHttpError) {
          setErrorMsg(err.message);
          if (err.status === 401 || err.status === 403) {
            setStatus("unauthorized");
          } else if (err.status === 404) {
            setStatus("not-found");
          } else {
            setStatus("error");
          }
        } else {
          setErrorMsg(
            err instanceof Error ? err.message : "Something went wrong."
          );
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Resetting to the loading state here (an event handler, not an effect) keeps
  // the effect body free of synchronous setState calls.
  const retry = useCallback(() => {
    setStatus("loading");
    setErrorMsg(null);
    setReloadKey((key) => key + 1);
  }, []);

  // Newest first, grouped by calendar day.
  const grouped = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const byDay = new Map<string, TimelineEvent[]>();
    for (const event of sorted) {
      const day = formatDay(event.date);
      const list = byDay.get(day) ?? [];
      list.push(event);
      byDay.set(day, list);
    }
    return [...byDay.entries()];
  }, [events]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Page header with glassmorphism */}
      <section className="rounded-2xl border border-white/20 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 backdrop-blur-xl p-6 shadow-lg">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Health Timeline
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Every documented event in chronological order, with links back to the
          source documents.
        </p>
      </section>

      {/* Loading state */}
      {status === "loading" && (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border border-white/20 bg-white/40 p-12 shadow-lg backdrop-blur-xl"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-7 w-7 animate-spin text-teal-600" aria-hidden="true" />
          <p className="text-sm text-slate-600">Loading your timeline…</p>
        </div>
      )}

      {/* Error states: 401/403, 404, and everything else */}
      {(status === "unauthorized" ||
        status === "not-found" ||
        status === "error") && (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border border-red-200/40 bg-red-50/50 p-12 text-center shadow-lg backdrop-blur-xl"
          role="alert"
        >
          <AlertTriangle className="h-7 w-7 text-red-600" aria-hidden="true" />
          <p className="text-sm font-medium text-red-800">
            {status === "unauthorized"
              ? "You are not signed in or your session has expired."
              : status === "not-found"
                ? "The timeline service could not be found."
                : "The timeline could not be loaded."}
          </p>
          <p className="max-w-md text-sm text-red-600">
            {status === "unauthorized"
              ? "Sign in again to view your health timeline, then retry."
              : status === "not-found"
                ? "The backend does not expose the timeline endpoint this page calls."
                : errorMsg}
          </p>
          {status === "not-found" && errorMsg && (
            <p className="max-w-md text-xs text-red-500">{errorMsg}</p>
          )}
          <button
            type="button"
            onClick={retry}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {status === "ready" && events.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/20 bg-white/40 p-12 text-center shadow-lg backdrop-blur-xl">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/20 text-slate-400 backdrop-blur-md">
            <CalendarClock className="h-8 w-8" aria-hidden="true" />
          </span>
          <h3 className="text-base font-semibold text-slate-900">
            No medical timeline events yet.
          </h3>
          <p className="max-w-sm text-sm text-slate-600">
            Once you upload lab reports, imaging, or prescriptions, they will
            appear here in chronological order.
          </p>
          <Link
            href="/upload"
            className="mt-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all duration-300 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            Upload your first document
          </Link>
        </div>
      )}

      {/* Populated timeline */}
      {status === "ready" && events.length > 0 && (
        <p className="text-sm text-slate-600" aria-live="polite">
          Showing <span className="font-semibold text-teal-700">{events.length}</span>{" "}
          event{events.length !== 1 ? "s" : ""}, newest first.
        </p>
      )}
      {status === "ready" && events.length > 0 && (
        <ol className="relative ml-2 space-y-8 border-l-2 border-white/40 pl-6 sm:ml-3 sm:pl-8">
          {grouped.map(([day, dayEvents]) => (
            <li key={day} className="relative">
              {/* Date marker on the vertical line */}
              <span
                className="absolute -left-[35px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-cyan-600 ring-4 ring-slate-100/60 sm:-left-[43px]"
                aria-hidden="true"
              >
                <CalendarClock className="h-3.5 w-3.5 text-white" />
              </span>
              <h3 className="text-sm font-semibold text-teal-700">{day}</h3>

              <div className="mt-3 space-y-3">
                {dayEvents.map((event) => {
                  const TypeIcon = TYPE_ICONS[event.type];
                  const time = formatTime(event.date);
                  const expanded = expandedId === event.id;
                  const hasMetadata = Object.keys(event.metadata).length > 0;
                  return (
                    <div key={event.id}>
                      <article className="rounded-2xl border border-white/20 bg-white/40 shadow-lg backdrop-blur-xl transition-all duration-300 hover:border-white/30 hover:shadow-xl">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : event.id)}
                          aria-expanded={expanded}
                          aria-controls={`timeline-detail-${event.id}`}
                          className="flex w-full items-start gap-4 rounded-2xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                        >
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg backdrop-blur-sm ${TYPE_STYLES[event.type]}`}
                            aria-hidden="true"
                          >
                            <TypeIcon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_STYLES[event.type]}`}
                              >
                                {event.type}
                              </span>
                              {time && (
                                <span className="text-xs text-slate-500">{time}</span>
                              )}
                            </div>
                            <h4 className="mt-1.5 text-sm font-medium leading-relaxed text-slate-900">
                              {event.title}
                            </h4>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                              <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              <span className="truncate">Source: {event.documentId}</span>
                            </p>
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                            aria-hidden="true"
                          />
                        </button>

                        {expanded && (
                          <div
                            id={`timeline-detail-${event.id}`}
                            className="border-t border-white/20 px-4 pb-4 pt-3"
                          >
                            <p className="text-sm leading-relaxed text-slate-700">
                              {event.description || "No description was extracted from this document."}
                            </p>
                            {hasMetadata && (
                              <dl className="mt-3 grid gap-2 rounded-xl border border-white/20 bg-white/30 p-3 sm:grid-cols-2">
                                {Object.entries(event.metadata).map(([key, value]) => (
                                  <div key={key} className="min-w-0">
                                    <dt className="text-xs font-medium text-slate-500">{humanizeKey(key)}</dt>
                                    <dd className="break-words text-sm text-slate-900">
                                      {String(value)}
                                    </dd>
                                  </div>
                                ))}
                              </dl>
                            )}
                            <Link
                              href={`/documents/${event.documentId}`}
                              className="mt-3 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-teal-700 transition-colors hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                            >
                              <FileText className="h-4 w-4" aria-hidden="true" />
                              Open source document
                            </Link>
                          </div>
                        )}
                      </article>
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
