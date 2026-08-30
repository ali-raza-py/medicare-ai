"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { askMedicalQuestion } from "@/lib/api";
import { getAllDocuments } from "@/lib/uploaded-documents";
import { DEMO_DOCUMENT_DETAILS } from "@/lib/demo-data";
import type { MedicalAnswerResponse, MedicalDocumentRecord } from "@/types/medical";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  evidence?: { documentName: string; snippet: string; sourceId: string }[];
  confidence?: string;
  provider?: string;
  model?: string;
  loading?: boolean;
};

const toMedicalDocumentRecord = (doc: {
  id: string;
  name: string;
  kind?: string;
  date?: string;
  status?: "processed" | "processing";
  flag?: string;
}): MedicalDocumentRecord => ({
  id: doc.id,
  title: doc.name,
  type: doc.kind ?? "report",
  date: doc.date ?? new Date().toISOString().slice(0, 10),
  status: doc.status === "processing" ? "Needs review" : "Ready",
  summary: "Relevant patient record document loaded for question answering.",
});

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [documents, setDocuments] = useState<MedicalDocumentRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const available = getAllDocuments().slice(0, 6).map(toMedicalDocumentRecord);
    setDocuments(available);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedDocuments = useMemo(
    () => documents.filter((doc) => selectedIds.includes(doc.id)),
    [documents, selectedIds],
  );

  const handleToggleDocument = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  /** Build rich context text from selected documents (demo details + uploaded metadata). */
  const buildContext = (): string[] => {
    const parts: string[] = [];
    for (const doc of selectedDocuments) {
      const detail = DEMO_DOCUMENT_DETAILS[doc.id];
      if (detail) {
        const lines = [
          `Document: ${doc.title} (${doc.type}, ${doc.date})`,
          `Summary: ${detail.summary}`,
        ];
        if (detail.values) {
          lines.push("Values:");
          for (const v of detail.values) {
            const flagLabel = v.flag !== "normal" ? ` [${v.flag.toUpperCase()}]` : "";
            lines.push(`  - ${v.label}: ${v.value} (ref: ${v.referenceRange})${flagLabel}`);
          }
        }
        if (detail.impression) {
          lines.push(`Impression: ${detail.impression}`);
        }
        parts.push(lines.join("\n"));
      } else {
        // Uploaded document — just the metadata, backend will look up full content by ID
        parts.push(`Document: ${doc.title} (${doc.type}, ${doc.date})`);
      }
    }
    return parts;
  };

  const handleSubmit = async () => {
    const trimmed = question.trim();
    if (!trimmed) {
      setError("Please enter a question first.");
      return;
    }

    setError(null);
    setLoading(true);

    // Add the user message and a loading placeholder
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const loadingMsg: ChatMessage = { role: "assistant", content: "", loading: true };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setQuestion("");

    try {
      const contextParts = buildContext();
      // Previous conversation history (exclude the just-added user message)
      const history = messages
        .filter((m) => !m.loading)
        .map((m) => ({ role: m.role, content: m.content }));

      const response: MedicalAnswerResponse = await askMedicalQuestion({
        question: trimmed,
        documents: selectedDocuments,
        context: contextParts.length > 0 ? contextParts : undefined,
        history: history.length > 0 ? history : undefined,
      });

      // Replace loading placeholder with the real answer
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
      // Remove the loading placeholder on error
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

  const hasMessages = messages.length > 0;

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] w-full max-w-5xl flex-col gap-4">
      {/* Header */}
      <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-teal-600/10 to-cyan-600/10 px-5 py-4 shadow-lg backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-700">
              Ask MediCare AI
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Clinical question assistant
            </h1>
          </div>
        </div>
      </div>

      {/* Document selector (collapsible) */}
      <div className="rounded-2xl border border-white/20 bg-white/60 px-4 py-3 shadow-lg backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">
            Reference documents{" "}
            <span className="ml-1 font-normal text-slate-500">
              ({selectedIds.length} selected)
            </span>
          </p>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
            >
              <X className="h-3 w-3" />
              Clear selection
            </button>
          )}
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {documents.map((doc) => {
            const selected = selectedIds.includes(doc.id);
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => handleToggleDocument(doc.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${
                  selected
                    ? "border-teal-500 bg-teal-50 font-medium text-teal-900"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                }`}
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="max-w-[140px] truncate">{doc.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/20 bg-slate-950 shadow-lg">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
          <span className="text-xs font-medium text-teal-400">
            Evidence-based answers
          </span>
          {messages.length > 0 && (
            <span className="ml-auto text-xs text-slate-500">
              {messages.filter((m) => m.role === "assistant" && !m.loading).length} answer
              {messages.filter((m) => m.role === "assistant" && !m.loading).length !== 1
                ? "s"
                : ""}
            </span>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {!hasMessages && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <Sparkles className="mx-auto h-6 w-6 text-teal-400" />
                <p className="mt-3 text-sm font-medium text-slate-200">
                  Ask a medical question
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Select reference documents above for record-based answers,
                  <br />
                  or ask any general medical question.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "What do my blood test results indicate?",
                  "Explain HbA1c levels",
                  "What are normal cholesterol ranges?",
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuestion(q)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:border-teal-500/50 hover:text-teal-300"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-600/20 text-teal-400">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  msg.role === "user"
                    ? "bg-teal-600 text-white"
                    : "border border-white/10 bg-white/5 text-slate-100"
                }`}
              >
                {msg.loading ? (
                  <div className="flex items-center gap-2 py-1 text-sm text-slate-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Thinking...
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-sm leading-7">{msg.content}</p>
                    {msg.evidence && msg.evidence.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t border-white/10 pt-2.5">
                        <p className="text-xs font-medium text-slate-400">Sources</p>
                        {msg.evidence.slice(0, 3).map((e, j) => (
                          <div
                            key={j}
                            className="rounded-lg bg-white/5 px-2.5 py-1.5"
                          >
                            <p className="text-xs font-medium text-teal-400">
                              {e.documentName}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                              {e.snippet}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.confidence && msg.role === "assistant" && (
                      <p className="mt-2 text-xs text-slate-500">
                        Confidence: {msg.confidence}
                        {msg.provider && msg.provider !== "fallback" && (
                          <span className="ml-2">
                            ({msg.provider}/{msg.model})
                          </span>
                        )}
                      </p>
                    )}
                  </>
                )}
              </div>
              {msg.role === "user" && (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-600/40 text-teal-200">
                  <User className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Error bar */}
        {error && (
          <div className="mx-4 mb-2 rounded-xl border border-red-500/30 bg-red-950/50 px-3 py-2 text-xs text-red-300">
            <div className="flex items-start justify-between gap-2">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="shrink-0 text-red-400 hover:text-red-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-white/10 p-3">
          <div className="flex gap-2">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder={
                selectedIds.length > 0
                  ? "Ask about the selected records..."
                  : "Ask a medical question..."
              }
              className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/20"
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !question.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-xl bg-teal-600 text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-center text-xs text-slate-600">
            Press Enter to send &middot; Shift+Enter for a new line
          </p>
        </div>
      </div>
    </div>
  );
}
