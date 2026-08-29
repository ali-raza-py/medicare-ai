"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2, MailCheck } from "lucide-react";
import Logo from "@/components/Logo";
import { resetPassword } from "@/lib/auth";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordCard />
    </Suspense>
  );
}

function ForgotPasswordCard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): boolean {
    if (!email.trim()) {
      setError("Email is required.");
      return false;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Enter a valid email address.");
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
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <Logo size="lg" />
              <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
                Check your email
              </h1>
              <div
                role="status"
                className="mt-4 flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800"
              >
                <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  If an account exists for <strong>{email}</strong>, we sent a
                  password-reset link. Open the link in the email to set a new
                  password.
                </p>
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Did not receive it? Check your spam folder, or try again in a
                few minutes.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Try a different email
              </button>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </button>
            </div>
          </div>
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
              Reset your password
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter your account email and we will send you a link to reset
              your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            ) : null}

            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Remember your password?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="font-semibold text-teal-700 hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
          MediCare AI organizes and explains your records. It does not provide
          medical advice, diagnosis, or treatment.
        </p>
      </div>
    </main>
  );
}
