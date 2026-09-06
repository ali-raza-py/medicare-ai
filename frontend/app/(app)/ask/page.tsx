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
  Check,
  ClipboardList,
  FilePlus2,
  MessageSquare,
  MoreHorizontal,
  PanelRight,
  RotateCcw,
} from "lucide-react";
import { askMedicalQuestion, fetchDocuments } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { MedicalAnswerResponse, MedicalDocumentRecord } from "@/types/medical";
import type { BackendDocumentListItem } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  evidence?: { documentName: string; snippet: string; sourceId: string }[];
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
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-100"
      >
        <BookOpen className="h-3.5 w-3.5 text-teal-400" />
        <span className="text-xs font-semibold tracking-wide text-slate-600">
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
            className="rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3 shrink-0 text-teal-500" />
              <p className="text-xs font-medium text-teal-700">{e.documentName}</p>
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
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

function MessageBubble({ msg, userName }: { msg: ChatMessage; userName: string }) {
  const isUser = msg.role === "user";

  return (
    <div className={`group flex gap-3 animate-message ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${
          isUser
            ? "bg-slate-900 text-white"
            : "border border-teal-100 bg-teal-50 text-teal-600"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>

      {/* Bubble */}
      <div className={`min-w-0 max-w-[88%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            isUser
              ? "bg-slate-900 text-white"
              : "border border-slate-200 bg-white text-slate-700 shadow-slate-200/40"
          }`}
        >
          {msg.loading ? (
            <TypingIndicator />
          ) : (
            <>
              {!isUser && (
                <div className="mb-2 flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-teal-600">
                  <Sparkles className="h-3.5 w-3.5" />
                  MediCare insight for {userName}
                </div>
              )}
              <p className="whitespace-pre-wrap text-[0.9rem] leading-7">{msg.content}</p>
            </>
          )}
        </div>

        {/* Evidence sources (assistant only) */}
        {!msg.loading && msg.role === "assistant" && (
          msg.evidence && msg.evidence.length > 0 && (
            <EvidenceSources evidence={msg.evidence} />
          )
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
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [deepReasoning, setDeepReasoning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [docsStatus, setDocsStatus] = useState<DocsStatus>("loading");
  const [docsError, setDocsError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user: sessionUser } = useSession();
  const userName = sessionUser?.name?.split(" ")[0] || "there";

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

    const requestQuestion = deepReasoning
      ? `${trimmed}\n\nProvide a detailed, step-by-step explanation grounded in the selected medical records. Separate observed facts from interpretation, note uncertainty, and end with practical questions the patient can discuss with a clinician.`
      : trimmed;

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
        question: requestQuestion,
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
    <div className="mx-auto flex min-h-[calc(100vh-6.5rem)] w-full max-w-[1320px] flex-col gap-4 pb-2">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white px-5 py-4 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.35)] sm:px-7">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/15">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-950">
              Your health, explained clearly
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Ask questions and get answers grounded in your medical records
            </p>
          </div>
        </div>
        {hasMessages && (
          <button
            type="button"
            onClick={handleClearChat}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
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

      {/* ── Chat area ──────────────────────────────────────────── */}
      <div className="flex min-h-[620px] flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
        {/* Toolbar */}
        <div className="relative flex items-center gap-2 border-b border-slate-100 px-5 py-3.5 sm:px-7">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
          <span className="text-xs font-semibold text-slate-700">
            Evidence-based workspace
          </span>
          <span className="hidden items-center gap-1.5 text-[0.68rem] text-slate-400 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Private to your account
          </span>
          {messages.length > 0 && (
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3 w-3 text-slate-400" />
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
        <div className="flex-1 space-y-7 overflow-y-auto scrollbar-thin px-5 py-8 sm:px-12 lg:px-24">
          {!hasMessages && (
            <div className="flex min-h-[470px] flex-col items-center justify-center gap-7 text-center">
              {/* Hero icon */}
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-3xl bg-teal-500/10 blur-xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-xl shadow-slate-900/15">
                  <Sparkles className="h-8 w-8 text-teal-300" />
                </div>
              </div>

              <div>
                  <p className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Hi {userName}, what would you like to understand?
                </p>
                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                  Ask about a result, medication, or health trend. Select one or more records above to keep the answer focused and traceable.
                </p>
              </div>

              {/* Suggestion chips */}
              <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q.text}
                    type="button"
                    onClick={() => setQuestion(q.text)}
                    className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-left text-sm text-slate-600 transition-all duration-200 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                  >
                    <span className="text-base">{q.icon}</span>
                    <span className="flex-1">{q.text}</span>
                    <Lightbulb className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:text-teal-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} userName={userName} />
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Error bar */}
        {error && (
          <div className="mx-4 mb-2 animate-slide-up">
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <p className="flex-1 text-xs leading-relaxed text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="shrink-0 rounded-md p-0.5 text-red-500 transition hover:bg-red-100 hover:text-red-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-slate-100 bg-slate-50/80 p-4 sm:px-7 sm:py-5">
          {selectedDocuments.length > 0 && (
            <div className="mb-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <PanelRight className="h-3.5 w-3.5 shrink-0 text-teal-600" />
              <span className="shrink-0 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">Using</span>
              {selectedDocuments.map((doc) => (
                <button key={doc.id} type="button" onClick={() => handleToggleDocument(doc.id)} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:text-teal-700">
                  <FileText className="h-3 w-3 text-teal-600" />
                  <span className="max-w-32 truncate">{doc.title}</span>
                  <X className="h-3 w-3 text-slate-400" />
                </button>
              ))}
            </div>
          )}
          <div className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-500/10">
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
                className="w-full resize-none bg-transparent px-3 py-2.5 pr-12 text-sm text-slate-800 placeholder-slate-400 outline-none"
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !question.trim()}
                className={`absolute bottom-1.5 right-1.5 flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ${
                  loading || !question.trim()
                    ? "cursor-not-allowed bg-slate-200 text-slate-400"
                    : "bg-slate-950 text-white shadow-lg shadow-slate-900/20 hover:bg-teal-700"
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
            <div className="mt-1 flex items-center gap-2 border-t border-slate-100 pt-2">
              {documents.length > 0 && docsStatus === "ready" && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSourcesOpen((open) => !open)}
                    aria-expanded={sourcesOpen}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${sourcesOpen || selectedIds.length > 0 ? "bg-teal-50 text-teal-800" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    Sources
                    {selectedIds.length > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 px-1 text-[0.6rem] text-white">{selectedIds.length}</span>}
                  </button>
                  {sourcesOpen && (
                    <div className="absolute bottom-11 left-0 z-20 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/10">
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-1 pb-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">Choose your sources</p>
                          <p className="mt-0.5 text-xs text-slate-500">Answers use selected records only</p>
                        </div>
                        {selectedIds.length > 0 && <button type="button" onClick={() => setSelectedIds([])} className="text-xs font-semibold text-slate-400 hover:text-slate-700">Clear</button>}
                      </div>
                      <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                        {documents.map((doc) => {
                          const selected = selectedIds.includes(doc.id);
                          return (
                            <button key={doc.id} type="button" onClick={() => handleToggleDocument(doc.id)} className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition ${selected ? "bg-teal-50 text-teal-900" : "text-slate-600 hover:bg-slate-50"}`}>
                              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-400"}`}>{selected ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span>
                              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{doc.title}</span><span className="mt-0.5 block text-[0.68rem] text-slate-400">{doc.type} · {doc.date}</span></span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => setDeepReasoning((enabled) => !enabled)}
                aria-pressed={deepReasoning}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${deepReasoning ? "bg-teal-50 text-teal-800" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Deep reasoning
              </button>
              {deepReasoning && <span className="hidden text-[0.68rem] text-slate-400 sm:inline">More detailed, step-by-step answers</span>}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between px-1 text-[0.68rem] text-slate-400">
            <span className="flex items-center gap-1.5"><FilePlus2 className="h-3.5 w-3.5" /> Select records above to ground your answer</span>
            <MoreHorizontal className="hidden h-4 w-4 sm:block" />
          </div>
          <p className="mt-1 text-center text-[0.68rem] text-slate-400">
            Press <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono text-slate-500">Enter</kbd> to send
            {" "}&middot;{" "}
            <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono text-slate-500">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}
