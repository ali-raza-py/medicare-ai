"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  Lightbulb,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  X,
  AlertCircle,
  MessageSquare,
  RotateCcw,
} from "lucide-react";
import { askMedicalQuestion, fetchDocuments } from "@/lib/api";
import type { MedicalAnswerResponse, MedicalDocumentRecord } from "@/types/medical";
import type { BackendDocumentListItem } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  evidence?: { documentName: string; snippet: string; sourceId: string }[];
  confidence?: string;
  provider?: string;
  model?: string;
  loading?: boolean;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const backendToMedicalDocumentRecord = (doc: BackendDocumentListItem): MedicalDocumentRecord => ({
  id: doc.id,
  title: doc.title,
  type: doc.document_type ?? "report",
  date: doc.created_at ? doc.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
  status:
    doc.processing_status === "failed"
      ? "Extraction failed"
      : doc.processing_status === "processing"
        ? "Needs review"
        : "Ready",
  summary: "Relevant patient record document loaded for question answering.",
});

function confidenceColor(confidence?: string) {
  if (!confidence) return "text-slate-400 bg-slate-500/10";
  switch (confidence.toLowerCase()) {
    case "high":
      return "text-emerald-400 bg-emerald-500/10";
    case "medium":
      return "text-amber-400 bg-amber-500/10";
    case "low":
      return "text-rose-400 bg-rose-500/10";
    default:
      return "text-slate-400 bg-slate-500/10";
  }
}

function confidenceDot(confidence?: string) {
  if (!confidence) return "bg-slate-400";
  switch (confidence.toLowerCase()) {
    case "high":
      return "bg-emerald-400";
    case "medium":
      return "bg-amber-400";
    case "low":
      return "bg-rose-400";
    default:
      return "bg-slate-400";
  }
}

const SUGGESTED_QUESTIONS = [
  { icon: "🩸", text: "What do my blood test results indicate?" },
  { icon: "📊", text: "Explain HbA1c levels and what they mean" },
  { icon: "❤️", text: "What are normal cholesterol ranges?" },
  { icon: "💊", text: "How do I interpret liver function tests?" },
];

/* ------------------------------------------------------------------ */
/*  Typing indicator                                                   */
/* ------------------------------------------------------------------ */

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-teal-400 [animation-delay:0ms]" />
      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-teal-400 [animation-delay:150ms]" />
      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-teal-400 [animation-delay:300ms]" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Evidence sources (collapsible)                                     */
/* ------------------------------------------------------------------ */

function EvidenceSources({
  evidence,
}: {
  evidence: { documentName: string; snippet: string; sourceId: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? evidence : evidence.slice(0, 2);

  return (
    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-white/[0.03]"
      >
        <BookOpen className="h-3.5 w-3.5 text-teal-400" />
        <span className="text-xs font-semibold tracking-wide text-slate-300">
          {evidence.length} Source{evidence.length !== 1 ? "s" : ""}
        </span>
        <span className="ml-auto">
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
          )}
        </span>
      </button>
      <div className="space-y-1.5 px-3 pb-2.5">
        {visible.map((e, j) => (
          <div
            key={j}
            className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2"
          >
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3 shrink-0 text-teal-500" />
              <p className="text-xs font-medium text-teal-400">{e.documentName}</p>
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
              &ldquo;{e.snippet}&rdquo;
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chat message bubble                                                */
/* ------------------------------------------------------------------ */

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";

  return (
    <div
      className={`group flex gap-3 animate-message ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${
          isUser
            ? "bg-gradient-to-br from-teal-500 to-cyan-600 text-white"
            : "bg-slate-800 border border-white/10 text-teal-400"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            isUser
              ? "bg-gradient-to-br from-teal-600 to-teal-700 text-white"
              : "border border-white/10 bg-slate-900/80 text-slate-100"
          }`}
        >
          {msg.loading ? (
            <TypingIndicator />
          ) : (
            <p className="whitespace-pre-wrap text-[0.9rem] leading-7">{msg.content}</p>
          )}
        </div>

        {/* Evidence & confidence (assistant only) */}
        {!msg.loading && msg.role === "assistant" && (
          <>
            {msg.evidence && msg.evidence.length > 0 && (
              <EvidenceSources evidence={msg.evidence} />
            )}
            {msg.confidence && (
              <div className="mt-2 flex items-center gap-2 px-1">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium ${confidenceColor(msg.confidence)}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${confidenceDot(msg.confidence)}`} />
                  {msg.confidence} confidence
                </span>
                {msg.provider && msg.provider !== "fallback" && (
                  <span className="text-[0.65rem] text-slate-500">
                    via {msg.provider}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Main page component                                                */
/* ================================================================== */

type DocsStatus = "loading" | "error" | "ready";

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [documents, setDocuments] = useState<MedicalDocumentRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [docsStatus, setDocsStatus] = useState<DocsStatus>("loading");
  const [docsError, setDocsError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;

    // Load real backend documents — no demo fallback.
    fetchDocuments()
      .then((backendDocs) => {
        if (cancelled) return;
        const records = backendDocs
          .filter((doc) => doc.processing_status === "processed")
          .map(backendToMedicalDocumentRecord);
        setDocuments(records.slice(0, 6));
        setDocsStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setDocsError(err instanceof Error ? err.message : "Could not load your documents.");
        setDocsStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [question]);

  const selectedDocuments = useMemo(
    () => documents.filter((doc) => selectedIds.includes(doc.id)),
    [documents, selectedIds],
  );

  const handleToggleDocument = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  // No frontend context needed — the backend resolves document text by ID
  // and performs chunk retrieval via RAG.
  const buildContext = (): string[] => [];

  const handleSubmit = async () => {
    const trimmed = question.trim();
    if (!trimmed) {
      setError("Please enter a question first.");
      return;
    }

    setError(null);
    setLoading(true);

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const loadingMsg: ChatMessage = { role: "assistant", content: "", loading: true };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setQuestion("");

    try {
      const contextParts = buildContext();
      const history = messages
        .filter((m) => !m.loading)
        .map((m) => ({ role: m.role, content: m.content }));

      const response: MedicalAnswerResponse = await askMedicalQuestion({
        question: trimmed,
        documents: selectedDocuments,
        context: contextParts.length > 0 ? contextParts : undefined,
        history: history.length > 0 ? history : undefined,
      });

      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: response.answer,
          evidence: response.evidence.map((e) => ({
            documentName: e.documentName,
            snippet: e.snippet,
            sourceId: e.sourceId,
          })),
          confidence: response.confidence,
          provider: response.provider,
          model: response.model,
        },
      ]);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "The AI request could not be completed.";
      setError(message);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading) handleSubmit();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
  };

  const handleRetryDocs = () => {
    setDocsStatus("loading");
    setDocsError(null);
    setReloadKey((key) => key + 1);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] w-full max-w-5xl flex-col gap-3">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-2xl border border-white/40 bg-gradient-to-r from-teal-600/10 via-cyan-600/5 to-emerald-600/10 px-5 py-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/20">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Ask MediCare AI
            </h1>
            <p className="text-xs text-slate-500">
              Evidence-based clinical answers from your records
            </p>
          </div>
        </div>
        {hasMessages && (
          <button
            type="button"
            onClick={handleClearChat}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-800"
          >
            <RotateCcw className="h-3 w-3" />
            New chat
          </button>
        )}
      </div>

      {/* ── Document selector states ───────────────────────────── */}
      {docsStatus === "loading" && (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/40 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm">
          <Loader2 className="h-4 w-4 animate-spin text-teal-600" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-600">Loading your documents…</p>
        </div>
      )}

      {docsStatus === "ready" && documents.length === 0 && (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 shadow-sm backdrop-blur-sm">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="text-sm text-amber-700">
            No processed documents available. Upload and process documents
            first, then try asking a question.
          </p>
        </div>
      )}

      {docsStatus === "error" && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 shadow-sm backdrop-blur-sm">
          <p className="text-sm text-amber-700">
            Could not load your latest documents.
            {docsError && <span className="ml-1 text-xs text-amber-600/80">({docsError})</span>}
          </p>
          <button
            type="button"
            onClick={handleRetryDocs}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-500/10"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {/* ── Document selector ──────────────────────────────────── */}
      {documents.length > 0 && docsStatus !== "loading" && (
        <div className="rounded-2xl border border-white/40 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">
                Reference documents
              </p>
              {selectedIds.length > 0 && (
                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[0.65rem] font-semibold text-teal-700">
                  {selectedIds.length}
                </span>
              )}
            </div>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>
          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            {documents.map((doc) => {
              const selected = selectedIds.includes(doc.id);
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => handleToggleDocument(doc.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-left text-xs transition-all duration-200 ${
                    selected
                      ? "border-teal-400/60 bg-teal-50 font-semibold text-teal-800 shadow-sm shadow-teal-500/10"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  <FileText
                    className={`h-3.5 w-3.5 shrink-0 ${selected ? "text-teal-500" : "text-slate-400"}`}
                  />
                  <span className="max-w-[150px] truncate">{doc.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Chat area ──────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800/50 bg-slate-950 shadow-xl shadow-slate-900/20">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-500" />
          <span className="text-xs font-medium text-teal-400/80">
            Evidence-based answers
          </span>
          {messages.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <MessageSquare className="h-3 w-3 text-slate-600" />
              <span className="text-xs text-slate-500">
                {messages.filter((m) => m.role === "assistant" && !m.loading).length} response
                {messages.filter((m) => m.role === "assistant" && !m.loading).length !== 1
                  ? "s"
                  : ""}
              </span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-5 overflow-y-auto scrollbar-thin px-4 py-5 sm:px-6">
          {!hasMessages && (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              {/* Hero icon */}
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-full bg-teal-500/10 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 ring-1 ring-teal-500/20">
                  <Sparkles className="h-7 w-7 text-teal-400" />
                </div>
              </div>

              <div>
                <p className="text-base font-semibold text-slate-200">
                  How can I help you today?
                </p>
                <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-slate-400">
                  Ask a medical question or select reference documents above
                  for answers grounded in your health records.
                </p>
              </div>

              {/* Suggestion chips */}
              <div className="grid max-w-md gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q.text}
                    type="button"
                    onClick={() => setQuestion(q.text)}
                    className="group flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-left text-sm text-slate-300 transition-all duration-200 hover:border-teal-500/30 hover:bg-teal-500/5 hover:text-teal-300"
                  >
                    <span className="text-base">{q.icon}</span>
                    <span className="flex-1">{q.text}</span>
                    <Lightbulb className="h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:text-teal-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Error bar */}
        {error && (
          <div className="mx-4 mb-2 animate-slide-up">
            <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-950/40 px-3.5 py-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="flex-1 text-xs leading-relaxed text-red-300">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="shrink-0 rounded-md p-0.5 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-white/[0.06] bg-slate-950/80 p-3 sm:p-4">
          <div className="flex items-end gap-2.5">
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={
                  selectedIds.length > 0
                    ? "Ask about the selected records..."
                    : "Ask a medical question..."
                }
                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 pr-12 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 focus:border-teal-500/40 focus:bg-white/[0.07] focus:ring-2 focus:ring-teal-500/10"
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !question.trim()}
                className={`absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 ${
                  loading || !question.trim()
                    ? "cursor-not-allowed bg-slate-800 text-slate-600"
                    : "bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40"
                }`}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-[0.7rem] text-slate-600">
            Press <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 font-mono text-slate-400">Enter</kbd> to send
            {" "}&middot;{" "}
            <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 font-mono text-slate-400">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}
