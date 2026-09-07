"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  MailCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
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
  const [mode, setMode] = useState<Mode>(
    searchParams.get("mode") === "signup" ? "signup" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const isSignup = mode === "signup";

  useEffect(() => {
    const loadRememberedEmail = window.setTimeout(() => {
      const rememberedEmail = window.localStorage.getItem("medcare.remember-email");
      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberMe(true);
      }
    }, 0);
    return () => window.clearTimeout(loadRememberedEmail);
  }, []);

  // Surface errors forwarded from /auth/callback (e.g. expired confirmation link).
  const callbackError = searchParams.get("error");
  useEffect(() => {
    if (callbackError) {
      router.replace("/login");
    }
  }, [callbackError, router]);

  // Return the user to the protected page they originally requested. The
  // middleware appends ?next=<original path> when it redirects to /login.
  const rawNext = searchParams.get("next");
  const nextPath =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/dashboard";

  // Already signed in? Go straight to the target page.
  useEffect(() => {
    if (session) router.replace(nextPath);
  }, [session, router, nextPath]);

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
        const result = await signup(email.trim(), password, "patient");
        setNotice(
          result.needsEmailConfirmation
            ? `Account created for ${result.user.email}. Confirm your email, then sign in below.`
            : `Account created for ${result.user.email}. Sign in below.`,
        );
        setPassword("");
        setConfirmPassword("");
        setMode("signin");
      } else {
        await login(email.trim(), password);
        if (rememberMe) {
          window.localStorage.setItem("medcare.remember-email", email.trim());
        } else {
          window.localStorage.removeItem("medcare.remember-email");
        }
        router.replace(nextPath);
      }
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "";
      const message = /email.*(not confirmed|not verified)|confirm.*email/i.test(rawMessage)
        ? "Your email is not verified yet. Open the confirmation link sent to your inbox, then return here and sign in."
        : rawMessage || "Something went wrong. Please try again.";
      setErrors({
        form: message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#e9f0ed] px-4 py-6 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-[#c5ddd3]/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-[#d7e7dd]/80 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_24px_80px_rgba(31,65,55,0.16)] lg:min-h-[690px] lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative hidden overflow-hidden bg-[#123f3a] px-10 py-10 text-white lg:flex lg:flex-col">
          <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full border-[42px] border-[#2d8374]/40" />
          <div className="absolute -bottom-40 -left-28 h-96 w-96 rounded-full border-[55px] border-[#0c5b51]/80" />
          <div className="absolute right-10 top-36 h-24 w-24 rounded-full border border-[#77c8b4]/30" />

          <Link href="/" className="relative flex w-fit items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d8f3e9] text-[#123f3a] shadow-lg">
              <Activity className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold tracking-wide">MediCare AI</span>
          </Link>

          <div className="relative mt-auto max-w-sm">
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#9be0cc]/30 bg-[#d8f3e9]/10 text-[#b9f1df]">
              <Sparkles className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#9be0cc]">
              A clearer health record
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-[-0.04em]">
              Make every appointment more informed.
            </h2>
            <p className="mt-5 max-w-xs text-sm leading-6 text-[#c4ded6]">
              Keep reports, timelines, and questions together so you can focus on the conversation that matters.
            </p>

            <div className="mt-10 space-y-3 text-sm text-[#e1f3ed]">
              {[
                "Your records in one calm workspace",
                "Evidence-grounded answers when you need them",
                "Privacy-minded from the first upload",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#77c8b4]/20 text-[#b9f1df]">
                    <Check className="h-3 w-3" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-12 flex items-center gap-2 text-xs text-[#a8cec3]">
            <ShieldCheck className="h-4 w-4" />
            Secure access to your personal health workspace
          </div>
        </aside>

        <section className="px-6 py-8 sm:px-12 sm:py-12 lg:px-16 lg:py-14">
          <div className="flex items-center justify-between gap-4">
            <div className="lg:hidden">
              <Logo size="md" />
            </div>
            <Link
              href="/"
              className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#11675c]"
            >
              Back home <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-12 max-w-md lg:mt-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#168374]">
              {isSignup ? "Start your workspace" : "Welcome back"}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-[#102a2a] sm:text-5xl">
              {isSignup ? "Create a healthier record of your care." : "Pick up where your care left off."}
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
              {isSignup
                ? "Bring your medical documents into one organized, private space."
                : "Your medical records, timeline, and saved questions are ready when you are."}
            </p>

            <div className="mt-8 inline-flex rounded-full border border-[#d7e5df] bg-[#f4f8f6] p-1" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                role="tab"
                aria-selected={!isSignup}
                onClick={() => switchMode("signin")}
                className={`rounded-full px-5 py-2 text-xs font-bold transition-colors ${
                  !isSignup ? "bg-[#123f3a] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isSignup}
                onClick={() => switchMode("signup")}
                className={`rounded-full px-5 py-2 text-xs font-bold transition-colors ${
                  isSignup ? "bg-[#123f3a] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Create account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-9 space-y-5" noValidate>
              {(errors.form || callbackError) ? (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {errors.form || callbackError}
                </div>
              ) : null}

              {notice ? (
                <div role="status" className="flex items-start gap-2 rounded-xl border border-[#bce5d7] bg-[#effaf5] px-4 py-3 text-sm text-[#176b5d]">
                  <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  {notice}
                </div>
              ) : null}

              <div>
                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-600">Email address</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  className={`mt-2 w-full rounded-xl border bg-[#f7faf9] px-4 py-3.5 text-sm text-[#102a2a] outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                    errors.email
                      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                      : "border-[#dce9e4] focus:border-[#168374] focus:ring-[#cceee4]"
                  }`}
                />
                {errors.email ? <p className="mt-1.5 text-xs text-red-600">{errors.email}</p> : null}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-600">Password</label>
                  {!isSignup ? (
                    <button type="button" onClick={() => router.push("/forgot-password")} className="text-xs font-semibold text-[#168374] hover:text-[#0d5e54] hover:underline">Forgot password?</button>
                  ) : null}
                </div>
                <div className="relative mt-2">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    placeholder={isSignup ? "At least 6 characters" : "Your password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-invalid={Boolean(errors.password)}
                    className={`w-full rounded-xl border bg-[#f7faf9] py-3.5 pl-11 pr-12 text-sm text-[#102a2a] outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                      errors.password
                        ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                        : "border-[#dce9e4] focus:border-[#168374] focus:ring-[#cceee4]"
                    }`}
                  />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 hover:text-[#168374]">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password ? <p className="mt-1.5 text-xs text-red-600">{errors.password}</p> : null}
              </div>

              {isSignup ? (
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-wider text-slate-600">Confirm password</label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    aria-invalid={Boolean(errors.confirmPassword)}
                    className={`mt-2 w-full rounded-xl border bg-[#f7faf9] px-4 py-3.5 text-sm text-[#102a2a] outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                      errors.confirmPassword
                        ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                        : "border-[#dce9e4] focus:border-[#168374] focus:ring-[#cceee4]"
                    }`}
                  />
                  {errors.confirmPassword ? <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword}</p> : null}
                </div>
              ) : null}

              {!isSignup ? (
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-500">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#168374]"
                  />
                  Remember my email on this device
                </label>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#123f3a] px-4 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(18,63,58,0.18)] transition hover:bg-[#0d322f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {loading ? (isSignup ? "Creating account..." : "Signing in...") : isSignup ? "Create my account" : "Sign in to MediCare AI"}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-500">
              {isSignup ? "Already have an account?" : "New to MediCare AI?"}{" "}
              <button type="button" onClick={() => switchMode(isSignup ? "signin" : "signup")} className="font-bold text-[#168374] hover:text-[#0d5e54] hover:underline">
                {isSignup ? "Sign in" : "Create your account"}
              </button>
            </p>

            <p className="mt-8 flex items-start gap-2 text-xs leading-5 text-slate-400">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#168374]" />
              MediCare AI organizes and explains your records. It does not provide medical advice, diagnosis, or treatment.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
