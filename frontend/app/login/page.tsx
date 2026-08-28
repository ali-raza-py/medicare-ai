"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import Logo from "@/components/Logo";
import { DEMO_EMAIL, DEMO_PASSWORD, login } from "@/lib/auth";
import { useSession } from "@/lib/session";

type FieldErrors = { email?: string; password?: string; form?: string };

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export default function LoginPage() {
  const router = useRouter();
  const session = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Already signed in? Go straight to the dashboard.
  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

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
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setErrors({});
    if (!validate()) return;

    setLoading(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (error) {
      setErrors({
        form:
          error instanceof Error ? error.message : "Sign in failed. Please try again.",
      });
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
              Sign in to MedCare AI
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Your medical records, organized and evidence-grounded.
            </p>
          </div>

          <div className="mt-6 rounded-lg border border-teal-100 bg-teal-50/60 px-4 py-3 text-xs leading-relaxed text-teal-800">
            <p className="font-medium">Demo access</p>
            <p className="mt-0.5">
              Email: <span className="font-mono">{DEMO_EMAIL}</span>
              <span className="mx-1.5 text-teal-600">·</span>
              Password: <span className="font-mono">{DEMO_PASSWORD}</span>
            </p>
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
                  autoComplete="current-password"
                  placeholder="Your password"
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

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
          MedCare AI organizes and explains your records. It does not provide
          medical advice, diagnosis, or treatment.
        </p>
      </div>
    </main>
  );
}
