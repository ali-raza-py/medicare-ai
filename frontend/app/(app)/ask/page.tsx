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
    <div className="mt-4 border-t border-[#3b6463] pt-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-1 py-2 text-left transition hover:text-[#8ce8d6]"
      >
        <BookOpen className="h-3.5 w-3.5 text-teal-400" />
        <span className="text-xs font-bold tracking-wide text-[#b9d3d0]">
          {evidence.length} Source{evidence.length !== 1 ? "s" : ""}
        </span>
        <span className="ml-auto">
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-[#9dbbb8]" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-[#9dbbb8]" />
          )}
        </span>
      </button>
      <div className="space-y-1.5 px-3 pb-2.5">
        {visible.map((e, j) => (
          <div
            key={j}
            className="border-l-2 border-[#5ccdb8] px-3 py-2"
          >
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3 shrink-0 text-teal-500" />
              <p className="text-xs font-bold text-[#8ce8d6]">{e.documentName}</p>
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#b9d3d0]">
              &ldquo;{e.snippet}&rdquo;
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Flat conversation row                                               */
/* ------------------------------------------------------------------ */

function MessageBubble({ msg, userName }: { msg: ChatMessage; userName: string }) {
  const isUser = msg.role === "user";

  return (
    <div className={`group flex gap-3 border-b border-[#315b5a] py-5 animate-message ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          isUser
            ? "bg-[#327c73] text-white"
            : "border border-[#4c7774] bg-[#234f4e] text-[#8ce8d6]"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>

      {/* Bubble */}
      <div className={`min-w-0 max-w-[88%] ${isUser ? "items-end text-right" : "items-start"}`}>
        <div className={isUser ? "text-[#e1f2ef]" : "text-[#d4e7e4]"}>
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
    <div className="mx-auto flex h-[calc(100dvh-9rem)] min-h-0 w-full max-w-[1320px] flex-col gap-4 overflow-hidden pb-2">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#315b5a] bg-[#214b4a] px-5 py-4 shadow-[0_18px_38px_rgba(9,37,40,0.22)] sm:px-7">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0c2b31] text-[#8ce8d6] shadow-lg shadow-[#0c2b31]/30">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#f0fbf8]">
              Your health, explained clearly
            </h1>
            <p className="mt-0.5 text-xs text-[#b9d3d0]">
              Ask questions and get answers grounded in your medical records
            </p>
          </div>
        </div>
        {hasMessages && (
          <button
            type="button"
            onClick={handleClearChat}
            className="flex items-center gap-1.5 rounded-xl border border-[#4c7774] bg-[#2a5957] px-3.5 py-2 text-xs font-bold text-[#d4e7e4] shadow-sm transition hover:border-[#8ce8d6] hover:text-white"
          >
            <RotateCcw className="h-3 w-3" />
            New chat
          </button>
        )}
      </div>

      {/* ── Document selector states ───────────────────────────── */}
      {docsStatus === "loading" && (
        <div className="flex shrink-0 items-center justify-center gap-3 rounded-2xl border border-[#315b5a] bg-[#214b4a] px-4 py-3 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-teal-600" aria-hidden="true" />
          <p className="text-sm font-bold text-[#c6ddda]">Loading your documents…</p>
        </div>
      )}

      {docsStatus === "ready" && documents.length === 0 && (
        <div className="flex shrink-0 items-center justify-center gap-3 rounded-2xl border border-[#a58a4c]/40 bg-[#705f35]/35 px-4 py-3 shadow-sm">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="text-sm text-[#f1dfaa]">
            No processed documents available. Upload and process documents
            first, then try asking a question.
          </p>
        </div>
      )}

      {docsStatus === "error" && (
        <div className="flex shrink-0 items-center justify-between rounded-2xl border border-[#a58a4c]/40 bg-[#705f35]/35 px-4 py-3 shadow-sm">
          <p className="text-sm text-[#f1dfaa]">
            Could not load your latest documents.
            {docsError && <span className="ml-1 text-xs text-[#e4cc92]">({docsError})</span>}
          </p>
          <button
            type="button"
            onClick={handleRetryDocs}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#f1dfaa] transition hover:bg-[#a58a4c]/20"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {/* ── Chat area ──────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[#315b5a] bg-[#1b4546] shadow-[0_20px_60px_-30px_rgba(9,37,40,0.5)]">
        {/* Toolbar */}
        <div className="relative flex shrink-0 items-center gap-2 border-b border-[#315b5a] px-5 py-3.5 sm:px-7">
          <ShieldCheck className="h-3.5 w-3.5 text-[#8ce8d6]" />
          <span className="text-xs font-bold text-[#d4e7e4]">
            Evidence-based workspace
          </span>
          <span className="hidden items-center gap-1.5 text-[0.68rem] text-[#9dbbb8] sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5ccdb8]" />
            Private to your account
          </span>
          {messages.length > 0 && (
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3 w-3 text-[#9dbbb8]" />
              <span className="text-xs text-[#b9d3d0]">
                {messages.filter((m) => m.role === "assistant" && !m.loading).length} response
                {messages.filter((m) => m.role === "assistant" && !m.loading).length !== 1
                  ? "s"
                  : ""}
              </span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto scrollbar-thin px-5 py-6 sm:px-12 lg:px-24">
          {!hasMessages && (
            <div className="flex min-h-full flex-col items-center justify-center gap-6 py-8 text-center">
              {/* Hero icon */}
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-3xl bg-teal-500/10 blur-xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-[#0c2b31] text-white shadow-xl shadow-[#0c2b31]/30">
                  <Sparkles className="h-8 w-8 text-[#8ce8d6]" />
                </div>
              </div>

              <div>
                  <p className="text-2xl font-extrabold tracking-tight text-[#f0fbf8] sm:text-3xl">
                  Hi {userName}, what would you like to understand?
                </p>
                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#b9d3d0]">
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
                    className="group flex items-center gap-3 rounded-2xl border border-[#416766] bg-[#214b4a] px-4 py-3.5 text-left text-sm text-[#d4e7e4] transition-all duration-200 hover:border-[#75ead2] hover:bg-[#2b5b59] hover:text-white"
                  >
                    <span className="text-base">{q.icon}</span>
                    <span className="flex-1">{q.text}</span>
                    <Lightbulb className="h-3.5 w-3.5 shrink-0 text-[#9dbbb8] transition group-hover:text-[#8ce8d6]" />
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
            <div className="flex items-start gap-2 rounded-xl border border-red-300/40 bg-red-950/30 px-3.5 py-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
              <p className="flex-1 text-xs leading-relaxed text-red-100">{error}</p>
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
        <div className="shrink-0 border-t border-[#315b5a] bg-[#163b3d] p-4 sm:px-7 sm:py-5">
          {selectedDocuments.length > 0 && (
            <div className="mb-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <PanelRight className="h-3.5 w-3.5 shrink-0 text-[#8ce8d6]" />
              <span className="shrink-0 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#9dbbb8]">Using</span>
              {selectedDocuments.map((doc) => (
                <button key={doc.id} type="button" onClick={() => handleToggleDocument(doc.id)} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#2a5957] px-2.5 py-1.5 text-xs font-bold text-[#d4e7e4] shadow-sm ring-1 ring-[#4c7774] transition hover:text-[#8ce8d6]">
                  <FileText className="h-3 w-3 text-teal-600" />
                  <span className="max-w-32 truncate">{doc.title}</span>
                  <X className="h-3 w-3 text-slate-400" />
                </button>
              ))}
            </div>
          )}
          <div className="relative rounded-2xl border border-[#4c7774] bg-[#214b4a] p-2 shadow-sm transition focus-within:border-[#75ead2] focus-within:ring-4 focus-within:ring-[#75ead2]/10">
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
                className="w-full resize-none bg-transparent px-3 py-2.5 pr-12 text-sm text-[#f0fbf8] placeholder-[#9dbbb8] outline-none"
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !question.trim()}
                className={`absolute bottom-1.5 right-1.5 flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ${
                  loading || !question.trim()
                    ? "cursor-not-allowed bg-[#365d5b] text-[#9dbbb8]"
                    : "bg-[#0b9b8e] text-white shadow-lg shadow-[#0b9b8e]/20 hover:bg-[#087c72]"
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
            <div className="mt-1 flex items-center gap-2 border-t border-[#315b5a] pt-2">
              {documents.length > 0 && docsStatus === "ready" && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSourcesOpen((open) => !open)}
                    aria-expanded={sourcesOpen}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${sourcesOpen || selectedIds.length > 0 ? "bg-[#dff7ef] text-[#087c72]" : "text-[#b9d3d0] hover:bg-[#2a5957] hover:text-white"}`}
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    Sources
                    {selectedIds.length > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 px-1 text-[0.6rem] text-white">{selectedIds.length}</span>}
                  </button>
                  {sourcesOpen && (
                    <div className="absolute bottom-11 left-0 z-20 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-[#4c7774] bg-[#214b4a] p-3 shadow-2xl shadow-[#092528]/30">
                      <div className="flex items-start justify-between gap-3 border-b border-[#315b5a] px-1 pb-3">
                        <div>
                          <p className="text-sm font-bold text-[#f0fbf8]">Choose your sources</p>
                          <p className="mt-0.5 text-xs text-[#b9d3d0]">Answers use selected records only</p>
                        </div>
                        {selectedIds.length > 0 && <button type="button" onClick={() => setSelectedIds([])} className="text-xs font-semibold text-slate-400 hover:text-slate-700">Clear</button>}
                      </div>
                      <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                        {documents.map((doc) => {
                          const selected = selectedIds.includes(doc.id);
                          return (
                            <button key={doc.id} type="button" onClick={() => handleToggleDocument(doc.id)} className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition ${selected ? "bg-[#dff7ef] text-[#087c72]" : "text-[#d4e7e4] hover:bg-[#2a5957]"}`}>
                              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-[#0b9b8e] text-white" : "bg-[#365d5b] text-[#b9d3d0]"}`}>{selected ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span>
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
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${deepReasoning ? "bg-[#dff7ef] text-[#087c72]" : "text-[#b9d3d0] hover:bg-[#2a5957] hover:text-white"}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Deep reasoning
              </button>
              {deepReasoning && <span className="hidden text-[0.68rem] text-[#9dbbb8] sm:inline">More detailed, step-by-step answers</span>}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between px-1 text-[0.68rem] text-[#9dbbb8]">
            <span className="flex items-center gap-1.5"><FilePlus2 className="h-3.5 w-3.5" /> Select records above to ground your answer</span>
            <MoreHorizontal className="hidden h-4 w-4 sm:block" />
          </div>
          <p className="mt-1 text-center text-[0.68rem] text-[#9dbbb8]">
            Press <kbd className="rounded border border-[#4c7774] bg-[#2a5957] px-1 py-0.5 font-mono text-[#d4e7e4]">Enter</kbd> to send
            {" "}&middot;{" "}
            <kbd className="rounded border border-[#4c7774] bg-[#2a5957] px-1 py-0.5 font-mono text-[#d4e7e4]">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}
