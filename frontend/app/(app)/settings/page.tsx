"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Database,
  Info,
  Loader2,
  LogOut,
  Mail,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  User,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { displayNameFromEmail, logout } from "@/lib/auth";
import { useSession } from "@/lib/session";
import {
  clearUploadedDocuments,
  useUploadedDocuments,
} from "@/lib/uploaded-documents";

type AccountStatus = "loading" | "error" | "ready";

type AccountInfo = {
  email: string;
  userId: string;
  provider: string | null;
  createdAt: string | null;
  emailConfirmed: boolean;
  metadataName: string | null;
  expiresAt: string | null;
};

const SHOW_TECH_KEY = "medcare-settings-show-tech";

function formatDateTime(value: string | null): string {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function providerLabel(provider: string | null): string {
  if (!provider) return "Unknown";
  if (provider === "email") return "Email & password";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSession();

  const [accountStatus, setAccountStatus] = useState<AccountStatus>("loading");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [accountReloadKey, setAccountReloadKey] = useState(0);

  const [showTech, setShowTech] = useState(false);

  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const localUploads = useUploadedDocuments();
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user: authUser },
          error,
        } = await supabase.auth.getUser();
        if (cancelled) return;
        if (error || !authUser?.email) {
          setAccountError(
            error?.message ?? "Could not load your account information."
          );
          setAccountStatus("error");
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const metadata = authUser.user_metadata ?? {};
        const metadataName =
          typeof metadata.full_name === "string" && metadata.full_name.trim()
            ? metadata.full_name.trim()
            : typeof metadata.name === "string" && metadata.name.trim()
              ? metadata.name.trim()
              : null;

        setAccount({
          email: authUser.email,
          userId: authUser.id,
          provider:
            typeof authUser.app_metadata?.provider === "string"
              ? authUser.app_metadata.provider
              : null,
          createdAt: authUser.created_at ?? null,
          emailConfirmed: Boolean(
            authUser.email_confirmed_at ?? authUser.confirmed_at
          ),
          metadataName,
          expiresAt:
            session?.expires_at != null
              ? new Date(session.expires_at * 1000).toISOString()
              : null,
        });
        setAccountStatus("ready");
      } catch (err: unknown) {
        if (cancelled) return;
        setAccountError(
          err instanceof Error
            ? err.message
            : "Could not load your account information."
        );
        setAccountStatus("error");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [accountReloadKey]);

  // Restore the local "show technical details" preference (per-browser).
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        setShowTech(window.localStorage.getItem(SHOW_TECH_KEY) === "1");
      } catch {
        setShowTech(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTech = useCallback(() => {
    setShowTech((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SHOW_TECH_KEY, next ? "1" : "0");
      } catch {
        // storage blocked — preference simply won't persist
      }
      return next;
    });
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await logout();
      router.replace("/login");
    } catch (err: unknown) {
      setSignOutError(
        err instanceof Error ? err.message : "Sign out failed. Please try again."
      );
      setSigningOut(false);
    }
  };

  const clearLocalCache = () => {
    clearUploadedDocuments();
    setCacheCleared(true);
  };

  const displayName =
    account?.metadataName ??
    (user?.name ?? (account?.email ? displayNameFromEmail(account.email) : ""));
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Page header */}
      <section className="rounded-2xl border border-white/20 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 backdrop-blur-xl p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 text-teal-700 border border-white/20">
            <Settings className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Profile &amp; Settings
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Manage your account and see how MediCare AI handles your data.
            </p>
          </div>
        </div>
      </section>

      {sessionLoading && (
        <section className="flex items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/40 backdrop-blur-xl p-12 shadow-lg">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-600">Loading your session…</p>
        </section>
      )}

      {!sessionLoading && !user && (
        <section className="rounded-2xl border border-white/20 bg-white/40 backdrop-blur-xl p-12 text-center shadow-lg">
          <div className="flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-500 border border-white/20">
              <User className="h-7 w-7" aria-hidden="true" />
            </span>
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            You are not signed in
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to view and manage your account settings.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-teal-500 hover:to-cyan-500"
          >
            Go to sign in
          </Link>
        </section>
      )}

      {!sessionLoading && user && (
        <>
          {/* Profile */}
          <section className="rounded-2xl border border-white/20 bg-white/40 backdrop-blur-xl p-6 shadow-lg">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-teal-600" aria-hidden="true" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Profile
              </h3>
            </div>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-100 text-lg font-semibold text-teal-700">
                {initials || "?"}
              </span>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-slate-900">
                  {displayName || "MediCare AI user"}
                </p>
                <p className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{account?.email ?? user.email}</span>
                </p>
                {!account?.metadataName && (
                  <p className="mt-1 text-xs text-slate-400">
                    Display name is derived from your sign-in email. No profile
                    name has been set on your account.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Account */}
          <section className="rounded-2xl border border-white/20 bg-white/40 backdrop-blur-xl p-6 shadow-lg">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-600" aria-hidden="true" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Account
              </h3>
            </div>

            {accountStatus === "loading" && (
              <div className="mt-4 flex items-center gap-3 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin text-teal-600" aria-hidden="true" />
                Loading account details…
              </div>
            )}

            {accountStatus === "error" && (
              <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                  <div>
                    <p className="text-sm text-rose-700">{accountError}</p>
                    <button
                      type="button"
                      onClick={() => setAccountReloadKey((key) => key + 1)}
                      className="mt-2 text-sm font-medium text-teal-700 hover:text-teal-800"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {accountStatus === "ready" && account && (
              <>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/20 bg-white/40 p-3">
                    <dt className="text-xs font-medium text-slate-500">Email</dt>
                    <dd className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-900">
                      <span className="truncate">{account.email}</span>
                      {account.emailConfirmed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-500/20">
                          <XCircle className="h-3 w-3" aria-hidden="true" />
                          Not verified
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-white/20 bg-white/40 p-3">
                    <dt className="text-xs font-medium text-slate-500">Sign-in method</dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      {providerLabel(account.provider)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-white/20 bg-white/40 p-3">
                    <dt className="text-xs font-medium text-slate-500">Member since</dt>
                    <dd className="mt-1 flex items-center gap-1.5 text-sm text-slate-900">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      {formatDateTime(account.createdAt)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-white/20 bg-white/40 p-3">
                    <dt className="text-xs font-medium text-slate-500">Session expires</dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      {formatDateTime(account.expiresAt)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 border-t border-white/20 pt-4">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                  >
                    {signingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                    )}
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                  {signOutError && (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-rose-700">
                      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {signOutError}
                    </p>
                  )}
                </div>
              </>
            )}
          </section>
          {/* Preferences */}
          <section className="rounded-2xl border border-white/20 bg-white/40 backdrop-blur-xl p-6 shadow-lg">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-teal-600" aria-hidden="true" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Preferences
              </h3>
            </div>

            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Show technical account details
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Displays your user ID and session expiry below. Saved in this
                  browser only — MediCare AI has no server-side preference sync.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showTech}
                aria-label="Show technical account details"
                onClick={toggleTech}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${
                  showTech ? "bg-teal-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    showTech ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {showTech && account && (
              <dl className="mt-4 grid gap-2 rounded-xl border border-white/20 bg-white/40 p-3">
                <div>
                  <dt className="text-xs font-medium text-slate-500">User ID</dt>
                  <dd className="break-all text-sm text-slate-900">{account.userId}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Raw provider</dt>
                  <dd className="text-sm text-slate-900">{account.provider ?? "unknown"}</dd>
                </div>
              </dl>
            )}
          </section>

          {/* Data & privacy */}
          <section className="rounded-2xl border border-white/20 bg-white/40 backdrop-blur-xl p-6 shadow-lg">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-teal-600" aria-hidden="true" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Data &amp; privacy
              </h3>
            </div>

            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
              <p>
                Documents you upload are sent to the MediCare AI backend, where
                their text is extracted and stored together with your account so
                only you can see them. That stored content powers your Timeline,
                the Ask MediCare AI answers, and Report comparisons. It is never
                shared with other users.
              </p>
              <div className="flex items-start gap-2 rounded-xl border border-white/20 bg-gradient-to-r from-teal-500/5 to-cyan-500/5 p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-slate-600">
                  AI-generated summaries and comparisons are explanations of your
                  own records, not medical advice, diagnosis, or treatment.
                </p>
              </div>
              <p>
                This browser also keeps a small cache of upload metadata (file
                name, size, type and timestamp — never document contents). You
                can clear it at any time. Permanent deletion of documents from
                the backend is not available in this version of the app, so no
                delete option is shown here.
              </p>
            </div>

            <div className="mt-5 border-t border-white/20 pt-4">
              <button
                type="button"
                onClick={clearLocalCache}
                disabled={localUploads.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                <Database className="h-4 w-4" aria-hidden="true" />
                Clear local upload cache
                {localUploads.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {localUploads.length}
                  </span>
                )}
              </button>
              {cacheCleared && localUploads.length === 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Local upload cache cleared.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
