'use client';
import { useState, useRef, useEffect } from 'react';

type RiskLevel = 'low' | 'moderate' | 'high';

interface Exchange {
  id: string;
  query: string;
  response: string;
  risk: RiskLevel;
  timestamp: string;
}

const RISK_STYLES: Record<RiskLevel, { badge: string; dot: string; label: string; glow: string }> = {
  low: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Low risk', glow: 'shadow-emerald-400/40' },
  moderate: { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Moderate risk', glow: 'shadow-amber-400/40' },
  high: { badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', label: 'High risk', glow: 'shadow-rose-400/40' },
};

function analyzeSymptoms(query: string): { response: string; risk: RiskLevel } {
  const q = query.toLowerCase();
  const highFlags = ['chest pain', 'difficulty breathing', 'severe bleeding', 'unconscious', 'seizure', 'stroke'];
  const moderateFlags = ['fever', 'vomiting', 'persistent cough', 'dizziness', 'headache'];

  if (highFlags.some((f) => q.includes(f))) {
    return { risk: 'high', response: 'Symptoms described suggest urgent evaluation may be needed. Please seek in-person medical attention promptly.' };
  }
  if (moderateFlags.some((f) => q.includes(f))) {
    return { risk: 'moderate', response: 'Symptoms noted are worth monitoring. Track duration and severity, and consult a physician if they persist beyond 48 hours.' };
  }
  return { risk: 'low', response: 'Based on the description, readings appear within a typical range. Continue routine monitoring.' };
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * 9}deg) rotateX(${-py * 9}deg) translateZ(6px)`;
  };

  const onMouseLeave = () => {
    if (ref.current) {
      ref.current.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg) translateZ(0px)';
    }
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`transition-transform duration-300 ease-out will-change-transform ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  );
}

const VITALS = [
  {
    label: 'Heart Rate', value: '72', unit: 'bpm', range: '60–100 bpm',
    icon: <path d="M3 12h4l2-6 4 12 2-6h6" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    label: 'Blood Pressure', value: '120/80', unit: '', range: 'mmHg',
    icon: <path d="M12 3c-4 4.5-7 8-7 11.5A7 7 0 0012 21a7 7 0 007-6.5C19 11 16 7.5 12 3z" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    label: 'Oxygen Saturation', value: '98', unit: '%', range: '95–100%',
    icon: <path d="M12 2s6 7.2 6 11.5a6 6 0 11-12 0C6 9.2 12 2 12 2z" strokeLinecap="round" strokeLinejoin="round" />,
  },
];

export default function Dashboard() {
  const [query, setQuery] = useState('');
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const MAX_CHARS = 500;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [exchanges, loading]);

  const handleTextareaInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const submitQuery = () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setQuery('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setTimeout(() => {
      const { response, risk } = analyzeSymptoms(trimmed);
      setExchanges((prev) => [...prev, { id: crypto.randomUUID(), query: trimmed, response, risk, timestamp: formatTime(new Date()) }]);
      setLoading(false);
    }, 900 + Math.random() * 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitQuery();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submitQuery();
    }
  };

  return (
    <div className="relative flex min-h-screen bg-slate-50 overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal-300/25 rounded-full blur-3xl blob-a" />
        <div className="absolute top-1/3 -right-40 w-[28rem] h-[28rem] bg-cyan-300/20 rounded-full blur-3xl blob-b" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl blob-a" />
      </div>

      <aside className="w-64 bg-white/60 backdrop-blur-xl border-r border-white/60 p-6 flex flex-col justify-between shadow-xl shadow-slate-200/40">
        <div>
          <h2 className="text-xl font-bold text-teal-600 mb-8 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-lg shadow-teal-400/60" />
            MedCare AI
          </h2>
          <nav className="space-y-2">
            <a href="#" className="flex items-center gap-3 p-3 bg-teal-50/80 text-teal-700 font-semibold rounded-xl border border-teal-100 shadow-sm">Overview</a>
            <a href="#" className="flex items-center gap-3 p-3 text-slate-600 hover:bg-white/70 rounded-xl transition">Appointments</a>
            <a href="#" className="flex items-center gap-3 p-3 text-slate-600 hover:bg-white/70 rounded-xl transition">Patient Records</a>
          </nav>
        </div>
        <div className="text-xs text-slate-400">MedCare Hackathon v1.0</div>
      </aside>

      <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-xl shadow-slate-200/50">
            <h2 className="text-xl font-bold text-slate-800">Patient Overview</h2>
            <p className="text-sm text-slate-500 mt-1">Summary of recent vitals & activity</p>
            <div className="grid grid-cols-3 gap-4 mt-6">
              {VITALS.map((v) => (
                <TiltCard key={v.label} className="bg-white/80 p-4 rounded-2xl border border-slate-100 shadow-md shadow-slate-200/60">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-teal-500 mb-2">{v.icon}</svg>
                  <span className="text-xs text-slate-400 font-medium">{v.label}</span>
                  <p className="text-2xl font-extrabold text-slate-800 mt-1 font-mono tabular-nums">{v.value} <span className="text-sm font-normal text-slate-500">{v.unit}</span></p>
                  <span className="text-[11px] text-slate-400">Normal: {v.range}</span>
                </TiltCard>
              ))}
            </div>
          </div>

          <TiltCard className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-xl shadow-slate-200/50">
            <h3 className="font-bold text-slate-800 mb-4">Upcoming Appointments</h3>
            <div className="p-4 bg-white/70 rounded-xl flex justify-between items-center border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 text-white flex items-center justify-center font-semibold text-sm shadow-lg shadow-teal-400/40">SA</div>
                <div>
                  <p className="font-semibold text-slate-800">Dr. Sarah Ahmed</p>
                  <p className="text-xs text-slate-500">General Consultation • 10:30 AM</p>
                </div>
              </div>
              <span className="bg-teal-100 text-teal-700 text-xs font-semibold px-3 py-1 rounded-full">Confirmed</span>
            </div>
          </TiltCard>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-teal-200/40 flex flex-col h-[calc(100vh-4rem)]">
          <div className="p-6 pb-4 border-b border-slate-100 flex items-center gap-4">
            <div className="relative w-14 h-14 shrink-0">
              <div className="absolute inset-0 rounded-full orb-ring-a" />
              <div className="absolute inset-[3px] rounded-full orb-ring-b" />
              <div className="absolute inset-[7px] rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 shadow-lg shadow-teal-500/50 orb-core" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">MedCare AI Diagnostic Assistant</h3>
              <p className="text-xs text-slate-500">Clinical-language guidance, not a medical diagnosis.</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {exchanges.length === 0 && !loading && <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 px-4"><p className="text-sm">Describe symptoms below to get a risk assessment preview.</p></div>}
            {exchanges.map((ex) => (
              <div key={ex.id} className="space-y-2">
                <div className="flex justify-end"><div className="max-w-[85%] bg-slate-100/90 text-slate-800 text-sm rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">{ex.query}</div></div>
                <div className="flex justify-start"><div className={`max-w-[85%] bg-teal-50/90 border border-teal-100 text-teal-900 text-sm rounded-2xl rounded-tl-sm px-4 py-2.5 leading-relaxed shadow-md ${RISK_STYLES[ex.risk].glow}`}>
                  <p>{ex.response}</p>
                  <div className="flex items-center gap-2 mt-2"><span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${RISK_STYLES[ex.risk].badge}`}><span className={`w-1.5 h-1.5 rounded-full ${RISK_STYLES[ex.risk].dot}`} />{RISK_STYLES[ex.risk].label}</span><span className="text-[11px] text-slate-400">{ex.timestamp}</span></div>
                </div></div>
              </div>
            ))}
            {loading && <div className="flex justify-start"><div className="bg-teal-50/90 border border-teal-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.3s]" /><span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.15s]" /><span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" /></div></div>}
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t border-slate-100">
            <textarea ref={textareaRef} rows={1} value={query} maxLength={MAX_CHARS} onChange={(e) => setQuery(e.target.value)} onInput={handleTextareaInput} onKeyDown={handleKeyDown} placeholder="Describe symptoms or ask a clinical question..." className="w-full p-3 text-sm bg-white/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 resize-none" />
            <div className="flex items-center justify-between mt-2"><span className="text-[11px] text-slate-400">{query.length}/{MAX_CHARS} · ⌘/Ctrl + Enter to send</span><button type="submit" disabled={!query.trim() || loading} className="bg-gradient-to-br from-teal-500 to-cyan-600 hover:brightness-110 active:scale-95 disabled:bg-slate-200 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-medium px-5 py-2 rounded-xl transition-all shadow-lg shadow-teal-400/30 text-sm">{loading ? 'Analyzing…' : 'Analyze'}</button></div>
            <p className="text-[11px] text-slate-400 mt-2">AI output is informational only and does not replace advice from a licensed physician.</p>
          </form>
        </div>
      </main>

      <style jsx global>{`
        .blob-a { animation: floatA 12s ease-in-out infinite; }
        .blob-b { animation: floatA 15s ease-in-out infinite; animation-delay: -4s; }
        @keyframes floatA { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(24px, -28px) scale(1.06); } }
        .orb-core { animation: corePulse 2.4s ease-in-out infinite; }
        @keyframes corePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        .orb-ring-a { border: 1.5px dashed rgba(13,148,136,0.4); animation: spinCW 7s linear infinite; }
        .orb-ring-b { border: 1.5px dashed rgba(13,148,136,0.55); animation: spinCCW 5s linear infinite; }
        @keyframes spinCW { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spinCCW { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @media (prefers-reduced-motion: reduce) { .blob-a, .blob-b, .orb-core, .orb-ring-a, .orb-ring-b { animation: none !important; } }
      `}</style>
    </div>
  );
}
