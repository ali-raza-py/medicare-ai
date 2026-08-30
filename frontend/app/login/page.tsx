"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import Logo from "@/components/Logo";
import { login, signup } from "@/lib/auth";
import { useSession } from "@/lib/session";

type Mode = "signin" | "signup";
type FieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
};

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary so the page can prerender.
  return (
    <Suspense fallback={null}>
      <LoginCard />
    </Suspense>
  );
}

function LoginCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: session } = useSession();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const isSignup = mode === "signup";

  // Surface errors forwarded from /auth/callback (e.g. expired confirmation link).
  const callbackError = searchParams.get("error");
  useEffect(() => {
    if (callbackError) {
      setErrors((previous) => ({ ...previous, form: callbackError }));
      router.replace("/login");
    }
  }, [callbackError, router]);

  // Already signed in? Go straight to the dashboard.
  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  function switchMode(next: Mode) {
    setMode(next);
    setErrors({});
    setNotice(null);
    setPassword("");
    setConfirmPassword("");
  }

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!email.trim()) {
      next.email = "Email is required.";
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = "Enter a valid email address.";
    }
    if (!password) {
      next.password = "Password is required.";
    } else if (password.length < 6) {
      next.password = "Password must be at least 6 characters.";
    }
    if (isSignup && confirmPassword !== password) {
      next.confirmPassword = "Passwords do not match.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setErrors({});
    setNotice(null);
    if (!validate()) return;

    setLoading(true);
    try {
      if (isSignup) {
        const result = await signup(email.trim(), password);
        if (result.needsEmailConfirmation) {
          setNotice(
            `Account created for ${result.user.email}. We sent you a confirmation link — open it, then sign in below.`
          );
          setPassword("");
          setConfirmPassword("");
          setMode("signin");
        } else {
          router.replace("/dashboard");
        }
      } else {
        await login(email.trim(), password);
        router.replace("/dashboard");
      }
    } catch (error) {
      setErrors({
        form:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <Logo size="lg" />
            <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
              {isSignup ? "Create your account" : "Sign in to MediCare AI"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Your medical records, organized and evidence-grounded.
            </p>
          </div>

          <div
            className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1"
            role="tablist"
            aria-label="Authentication mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!isSignup}
              onClick={() => switchMode("signin")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                !isSignup
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isSignup}
              onClick={() => switchMode("signup")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isSignup
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Create account
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-teal-100 bg-teal-50/60 px-4 py-3 text-xs leading-relaxed text-teal-800">
            {isSignup ? (
              <p>
                Create your account with an email and password. You'll confirm
                your email address before signing in.
              </p>
            ) : (
              <p>
                Sign in with the account you created. New here? Switch to{" "}
                <span className="font-semibold">Create account</span> above — it
                takes less than a minute.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            {errors.form ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {errors.form}
              </div>
            ) : null}

            {notice ? (
              <div
                role="status"
                className="flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800"
              >
                <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
                {notice}
              </div>
            ) : null}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(errors.email)}
                className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:ring-2 ${
                  errors.email
                    ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                    : "border-slate-300 focus:border-teal-500 focus:ring-teal-100"
                }`}
              />
              {errors.email ? (
                <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  placeholder={isSignup ? "At least 6 characters" : "Your password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  className={`w-full rounded-lg border px-3.5 py-2.5 pr-11 text-sm shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:ring-2 ${
                    errors.password
                      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                      : "border-slate-300 focus:border-teal-500 focus:ring-teal-100"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
              {errors.password ? (
                <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>
              ) : null}
            </div>

            {isSignup ? (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-slate-700"
                >
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  aria-invalid={Boolean(errors.confirmPassword)}
                  className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:ring-2 ${
                    errors.confirmPassword
                      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                      : "border-slate-300 focus:border-teal-500 focus:ring-teal-100"
                  }`}
                />
                {errors.confirmPassword ? (
                  <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword}</p>
                ) : null}
              </div>
            ) : null}

            {isSignup ? null : (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => router.push("/forgot-password")}
                  className="text-sm font-medium text-teal-700 hover:text-teal-800 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading
                ? isSignup
                  ? "Creating account..."
                  : "Signing in..."
                : isSignup
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => switchMode(isSignup ? "signin" : "signup")}
              className="font-semibold text-teal-700 hover:underline"
            >
              {isSignup ? "Sign in" : "Create one"}
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
