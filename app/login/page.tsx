'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

const featureList = [
  'AI-guided health summaries',
  'Medical document organization',
  'Trusted care insights',
  'Clear personal health context',
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin');
  const [password, setPassword] = useState('12345');
  const [showPassword, setShowPassword] = useState(false);
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

    if (!email.trim()) {
      setError('Please enter your admin ID.');
      return;
    }
    if (!password.trim()) {
      setError('Password is required.');
      return;
    }
    if (mode === 'sign-in' && password.length < 5) {
      setError('Password must be at least 5 characters.');
      return;
    }

    const demoAdminId = process.env.NEXT_PUBLIC_DEMO_ADMIN_ID ?? 'admin';
    const demoAdminPassword = process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD ?? '12345';

    if (mode === 'sign-in' && email.trim() === demoAdminId && password === demoAdminPassword) {
      setIsLoading(true);
      setMessage('Demo mode active. Redirecting to dashboard...');
      window.setTimeout(() => {
        router.replace('/dashboard');
      }, 300);
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
        setMessage('Account created. Check your inbox to confirm your email before signing in.');
      } else if (result.data.session) {
        router.replace('/dashboard');
      } else {
        setError('Authentication did not create a session. Please try again.');
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

  const handleForgotPassword = () => {
    setError('Password reset is handled through your authentication provider.');
  };

  return (
    <div className="min-h-screen bg-[#edf5f3] text-[#0f172a]">
      <div className="mx-auto flex min-h-screen max-w-[1500px] items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-[1280px] overflow-hidden rounded-[32px] border border-[#d8e7e2] bg-[#f8fbfa] shadow-[0_28px_80px_rgba(17,47,46,0.08)] lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative overflow-hidden border-b border-[#dce9e5] bg-[linear-gradient(135deg,_#eefaf6_0%,_#edf5f3_45%,_#f5faf9_100%)] p-8 sm:p-10 lg:border-b-0 lg:border-r">
            <div className="absolute -left-16 top-12 h-44 w-44 rounded-full bg-[#dff7f1] blur-3xl" />
            <div className="absolute right-8 top-14 h-52 w-52 rounded-full bg-[#d4efe9] blur-3xl" />
            <div className="absolute bottom-6 left-12 h-40 w-40 rounded-full bg-[#ebf9f6] blur-3xl" />

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="mb-8 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#12a399] to-[#0f7d99] text-lg text-white shadow-[0_10px_24px_rgba(20,157,148,0.25)]">
                    ✚
                  </div>
                  <span className="text-[2rem] font-black tracking-[-0.08em] text-[#0d1d29]">Medicare</span>
                </div>

                <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[#cfe5df] bg-[#ebf9f5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0c7f74]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f8fcfb] text-[10px] text-[#0d8b82]">✦</span>
                  Smart healthcare access
                </div>

                <h1 className="max-w-[420px] text-[3rem] font-black leading-[0.9] tracking-[-0.08em] text-[#0f172a] sm:text-[4rem]">
                  Smarter healthcare
                  <span className="block text-[#0ea79d]">starts here.</span>
                </h1>

                <p className="mt-5 max-w-[430px] text-lg leading-8 text-[#536b7a]">
                  Access your personalized healthcare workspace and AI-powered tools in one place.
                </p>
              </div>

              <div className="relative mt-10 max-w-[430px] rounded-[28px] border border-[#d8e7e2] bg-white/65 p-5 shadow-[0_18px_30px_rgba(148,163,184,0.08)] backdrop-blur-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2f5867]">Your health space</div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dcfaf4] text-lg text-[#0f8b82]">✓</div>
                </div>

                <div className="space-y-3 text-sm text-[#39576a]">
                  {[
                    'Health information organized',
                    'Medical resources and summaries',
                    'AI assistance for better clarity',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e9faf6] text-[#0b8b80]">✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center bg-[#f8fbfa] p-6 sm:p-8 lg:p-10">
            <div className="w-full max-w-[470px]">
              <div className="mb-8">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0c7f74]">Welcome back</p>
                <h2 className="mt-3 text-4xl font-black tracking-[-0.07em] text-[#0f172a]">
                  {mode === 'sign-in' ? 'Sign in to your Medicare account' : 'Create your Medicare account'}
                </h2>
                <p className="mt-3 text-base text-[#536b7a]">
                  {mode === 'sign-in'
                    ? 'Continue to your personalized healthcare experience.'
                    : 'Set up a secure profile to organize your health information.'}
                </p>
              </div>

              {error && (
                <div role="alert" className="mb-5 rounded-2xl border border-[#f0c9c9] bg-[#fff3f3] px-4 py-3 text-sm text-[#9a2d2d]">
                  {error}
                </div>
              )}
              {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
                <div className="mb-5 rounded-2xl border border-[#dfeae7] bg-[#eefaf7] px-4 py-3 text-sm text-[#0b6b65]">
                  Demo mode is active locally. Use the saved admin preview credentials.
                </div>
              )}
              {message && (
                <div role="status" className="mb-5 rounded-2xl border border-[#cfe9e2] bg-[#edfaf6] px-4 py-3 text-sm text-[#0a6b62]">
                  {message}
                </div>
              )}

              <div className="mb-6">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#dfeae7] bg-white px-4 py-3.5 text-sm font-semibold text-[#1e2e3b] shadow-[0_10px_18px_rgba(148,163,184,0.06)] transition hover:-translate-y-0.5 hover:border-[#cfe5df] hover:bg-[#f7faf9] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f2f7f6] text-sm font-bold text-[#1e2e3b]">G</span>
                  Continue with Google
                </button>
              </div>

              <div className="mb-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#73879a]">
                <span className="h-px flex-1 bg-[#dfeae7]" />
                Or continue with secure access
                <span className="h-px flex-1 bg-[#dfeae7]" />
              </div>

              <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#2a3d4d]">
                    Admin ID
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your admin ID"
                    className="w-full rounded-2xl border border-[#dfeae7] bg-white px-4 py-3.5 text-base text-[#10222d] placeholder:text-[#7b8e9f] outline-none transition focus:border-[#0ea79d] focus:ring-4 focus:ring-[#dff7f2]"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#2a3d4d]">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-2xl border border-[#dfeae7] bg-white px-4 py-3.5 pr-12 text-base text-[#10222d] placeholder:text-[#7b8e9f] outline-none transition focus:border-[#0ea79d] focus:ring-4 focus:ring-[#dff7f2]"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-3 flex items-center text-lg text-[#57708b] transition hover:text-[#0b7d74]"
                    >
                      {showPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <label className="inline-flex items-center gap-2 text-[#536b7a]">
                    <input type="checkbox" className="h-4 w-4 accent-[#0ea79d]" />
                    Remember me
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="font-semibold text-[#0a7d74] transition hover:text-[#0b655e]"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#0ea79d] to-[#0c7fa2] px-4 py-3.5 text-base font-bold text-white shadow-[0_14px_28px_rgba(16,158,148,0.22)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-80"
                >
                  {isLoading ? (mode === 'sign-in' ? 'Signing in...' : 'Creating account...') : 'Sign In →'}
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-[#536b7a]">
                {mode === 'sign-in' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'));
                    setError('');
                    setMessage('');
                  }}
                  className="font-bold text-[#0a7d74] transition hover:text-[#0b655e]"
                >
                  {mode === 'sign-in' ? 'Create one' : 'Sign in'}
                </button>
              </p>

              <div className="mt-8 rounded-2xl border border-[#dfeae7] bg-[#f5faf8] px-4 py-3 text-center text-sm text-[#50687c]">
                Your health information is managed within your secure care workspace.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
