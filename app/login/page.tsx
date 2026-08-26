'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

const featureList = [
  'Upload PDFs and scanned reports',
  'Chronological timeline of patient updates',
  'Grounded answers from uploaded evidence',
  'Safe comparison without diagnosis claims',
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('error');
    if (authError) Promise.resolve().then(() => setError(authError.replaceAll('_', ' ')));
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const result = mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });

      if (result.error) {
        setError(result.error.message);
      } else if (mode === 'sign-up' && !result.data.session) {
        setMessage('Account created. Check your email to confirm your address before signing in.');
      } else if (result.data.session) {
        router.replace('/dashboard');
      } else {
        setError('Authentication did not create a session. Try again.');
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication is not configured.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) setError(oauthError.message);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Google authentication is not configured.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.18),transparent_25%)]" />
      <div className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl animate-pulse" />
      <div className="absolute bottom-8 right-10 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl animate-pulse" style={{ animationDelay: '800ms' }} />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 rounded-[32px] border border-white/10 bg-white/5 p-4 shadow-[0_35px_90px_rgba(15,23,42,0.7)] backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/70 p-8">
            <div className="absolute right-8 top-8 h-32 w-32 rounded-full border border-teal-400/30 bg-teal-500/10 blur-2xl" />
            <div className="absolute bottom-10 left-10 h-28 w-28 rounded-full border border-cyan-400/20 bg-cyan-500/10 blur-2xl" />

            <div className="relative">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">
                <span className="h-2 w-2 rounded-full bg-teal-400" />
                MediCare AI
              </div>

              <h1 className="max-w-xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
                Turn scattered records into a clear care story.
              </h1>

              <p className="mt-5 max-w-lg text-base text-slate-300">
                Organize patient files, compare document changes, and ask grounded questions without guessing or diagnosing.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {featureList.map((item, index) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-teal-400/40 hover:bg-slate-800/80"
                    style={{ animationDelay: `${index * 120}ms` }}
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 text-lg font-bold text-slate-950 shadow-lg shadow-teal-500/20">
                      {index + 1}
                    </div>
                    <p className="text-sm text-slate-200">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center rounded-[28px] border border-white/10 bg-slate-950/70 p-6 sm:p-8">
            <div className="w-full max-w-md">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Welcome</p>
                  <h2 className="mt-2 text-3xl font-bold text-white">{mode === 'sign-in' ? 'Sign in' : 'Create account'}</h2>
                </div>
                <div className="rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-xs font-medium text-teal-200">
                  Secure access
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-white/10"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-base text-slate-900">G</span>
                Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                <span className="h-px flex-1 bg-slate-700" />
                or use email
                <span className="h-px flex-1 bg-slate-700" />
              </div>

              {error && <p role="alert" className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
              {message && <p role="status" className="mb-4 rounded-xl border border-teal-400/30 bg-teal-500/10 p-3 text-sm text-teal-100">{message}</p>}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>

                <div className="flex items-center justify-between text-sm text-slate-400">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 accent-teal-500" />
                    Remember me
                  </label>
                  <span className="text-slate-500">Use your verified account email</span>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition duration-200 hover:brightness-110"
                >
                  {isLoading ? 'Working...' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-400">
                {mode === 'sign-in' ? 'New here?' : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(''); setMessage(''); }}
                  className="font-semibold text-teal-300 transition hover:text-teal-200"
                >
                  {mode === 'sign-in' ? 'Create an account' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
