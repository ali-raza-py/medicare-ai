"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import Logo from "@/components/Logo";
import { updatePassword } from "@/lib/auth";
import { useSession } from "@/lib/session";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordCard />
    </Suspense>
  );
}

function ResetPasswordCard() {
  const router = useRouter();
  const session = useSession();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // The auth callback route redirects here after exchanging the recovery code.
  // If the user is not authenticated at this point, the reset link is invalid or expired.
  useEffect(() => {
    // Give the auth state a moment to settle after the callback redirect.
    const timer = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready && !session) {
      setError(
        "This reset link is invalid or has expired. Please request a new one."
      );
    }
  }, [ready, session]);

  function validate(): boolean {
    if (!password) {
      setError("Password is required.");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    setError(null);
    return true;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    if (!validate()) return;

    setLoading(true);
    setError(null);
    try {
      await updatePassword(password);
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <Logo size="lg" />
              <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50">
                <CheckCircle className="h-7 w-7 text-teal-600" />
              </div>
              <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
                Password updated
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Your password has been changed successfully. You can now sign in
                with your new password.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.replace("/dashboard")}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
            >
              Go to dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Still waiting for auth state to settle after callback redirect.
  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          <p className="text-sm">Verifying reset link...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <Logo size="lg" />
            <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
              Set a new password
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter your new password below. It must be at least 6 characters.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">
                New password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={!session}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 pr-11 text-sm shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-new-password" className="block text-sm font-medium text-slate-700">
                Confirm new password
              </label>
              <input
                id="confirm-new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={!session}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !session}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>

          {!session && !error ? null : (
            <p className="mt-6 text-center text-sm text-slate-600">
              <button
                type="button"
                onClick={() => router.push("/forgot-password")}
                className="font-semibold text-teal-700 hover:underline"
              >
                Request a new reset link
              </button>
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
          MediCare AI organizes and explains your records. It does not provide
          medical advice, diagnosis, or treatment.
        </p>
      </div>
    </main>
  );
}
