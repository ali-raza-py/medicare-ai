"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  Plus,
  X,
} from "lucide-react";
import {
  addUploadedDocument,
  clearUploadedDocuments,
  getUploadedDocuments,
  removeUploadedDocument,
} from "@/lib/uploaded-documents";
import { createClient } from "@/lib/supabase/client";

type UploadStatus = "idle" | "uploading" | "success" | "error";

type FileEntry = {
  id: string;
  documentId?: string;
  file?: File;
  name: string;
  size: number;
  type: string;
  progress: number; // 0-100
  status: UploadStatus;
  error?: string;
  uploadedAt?: string;
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

// Maps HTTP status codes from the backend to human-readable messages.
function backendErrorMessage(status: number, body: string): string {
  // Try to extract FastAPI's { "detail": "..." } payload first.
  try {
    const parsed = JSON.parse(body);
    if (parsed.detail) return String(parsed.detail);
  } catch {
    // body is not JSON — fall through
  }
  if (status === 413) return "File exceeds the 50 MB size limit.";
  if (status === 415) return body || "This file type is not supported.";
  if (status === 400) return body || "Invalid upload request.";
  if (status >= 500) return `Server error (${status}). Please try again later.`;
  return `Upload failed (HTTP ${status}).`;
}

function humanFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + " " + sizes[i];
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllersRef = useRef<Record<string, AbortController>>({});
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const entriesRef = useRef<FileEntry[]>([]);

  // API base URL selection:
  // - If NEXT_PUBLIC_API_BASE_URL is set (e.g. https://medicare-ai-backend.onrender.com)
  //   the frontend talks directly to that external backend.
  // - If it is not set and NODE_ENV is production, fall back to the same origin
  //   (legacy Vercel serverless backend behind the /api/* rewrite).
  // - In local development the standalone uvicorn server on port 8000 is used.
  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000');

  // Retrieve the current Supabase access token (null if not logged in)
  const getAccessToken = async (): Promise<string | null> => {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    } catch {
      return null;
    }
  };

  // Keep a ref in sync so upload finalisation can read entry metadata.
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  // Restore previously uploaded files (demo-mode persistence) on mount.
  useEffect(() => {
    const restored = getUploadedDocuments().map((d) => ({
      id: d.id,
      name: d.name,
      size: d.size,
      type: d.type,
      progress: 100,
      status: "success" as UploadStatus,
      uploadedAt: d.uploadedAt,
    }));
    setEntries(restored);
  }, []);

  const announce = (msg: string) => {
    setAnnouncements((s) => [...s.slice(-4), msg]);
  };

  const validateFile = (f: File) => {
    if (
      !ALLOWED_TYPES.includes(f.type) &&
      !f.name.match(/\.(pdf|png|jpe?g|webp)$/i)
    ) {
      return "Unsupported file type. Accepted: PDF, JPG, JPEG, PNG, WebP.";
    }
    if (f.size > MAX_FILE_SIZE) return "File exceeds the 50 MB limit.";
    return null;
  };

  const addFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const newEntries: FileEntry[] = [];
    for (const f of files) {
      const err = validateFile(f);
      const entry: FileEntry = {
        id: uid(),
        file: f,
        name: f.name,
        size: f.size,
        type: f.type || "unknown",
        progress: 0,
        status: err ? "error" : "idle",
        error: err || undefined,
      };
      newEntries.push(entry);
      if (!err) announce(`Queued ${f.name}`);
      else announce(`Rejected ${f.name}: ${err}`);
    }
    setEntries((prev) => [...newEntries, ...prev]);
    // auto-start uploads for valid files
    newEntries.forEach((e) => e.status === "idle" && startUpload(e.id));
  };

  const handleDrop = (ev: React.DragEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    setDragActive(false);
    if (ev.dataTransfer?.files && ev.dataTransfer.files.length) {
      addFiles(ev.dataTransfer.files);
    }
  };

  const handleFileSelect = (ev: React.ChangeEvent<HTMLInputElement>) => {
    if (ev.target.files && ev.target.files.length) addFiles(ev.target.files);
    ev.currentTarget.value = ""; // reset
  };

  const startUpload = async (id: string) => {
    const entry = entriesRef.current.find((e) => e.id === id);
    if (!entry?.file) return;

    const token = await getAccessToken();

    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "uploading", progress: 0 } : e))
    );

    const controller = new AbortController();
    abortControllersRef.current[id] = controller;

    const formData = new FormData();
    formData.append('file', entry.file);
    formData.append('title', entry.name.replace(/\.[^.]+$/, ''));

    // Use XHR for real progress tracking
    const xhr = new XMLHttpRequest();
    const uploadUrl = `${API_BASE}/api/documents/upload`;

    xhr.open('POST', uploadUrl, true);
    xhr.timeout = 60_000; // 60-second hard timeout
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.round((ev.loaded / ev.total) * 90); // reserve 10% for processing
        setEntries((prev) =>
          prev.map((e) => (e.id === id ? { ...e, progress: pct } : e))
        );
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          const documentId = result.document_id;

          // The backend runs OCR synchronously during the upload, so the
          // response already carries the honest final state.
          if (result.status === 'failed') {
            // Upload succeeded but OCR failed — surface the real reason
            // instead of pretending the document was processed.
            const reason: string =
              result.error_message ||
              'OCR could not extract any readable text from this document.';
            setEntries((prev) =>
              prev.map((e) =>
                e.id === id
                  ? { ...e, status: "error", error: reason, documentId, progress: 100 }
                  : e
              )
            );
            announce(`Text extraction failed for ${entry.name}`);
            delete abortControllersRef.current[id];
            return;
          }

          if (result.status === 'processed') {
            // Extraction already finished during the upload — done.
            const uploadedAt = new Date().toISOString();
            setEntries((prev) =>
              prev.map((e) =>
                e.id === id
                  ? { ...e, status: "success", progress: 100, uploadedAt, documentId }
                  : e
              )
            );
            addUploadedDocument({
              id: documentId,
              name: entry.name,
              size: entry.size,
              type: entry.type,
              uploadedAt,
            });
            announce(`Uploaded and processed ${entry.name}`);
            delete abortControllersRef.current[id];
            return;
          }

          // Non-final status (future async backend) — poll the process
          // endpoint until the document reaches a final state.
          setEntries((prev) =>
            prev.map((e) => (e.id === id ? { ...e, progress: 95 } : e))
          );

          const processResponse = await fetch(`${API_BASE}/api/documents/process`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ document_id: documentId }),
            signal: controller.signal,
          });

          if (!processResponse.ok) {
            throw new Error(`Processing failed: ${processResponse.statusText}`);
          }

          const processData = await processResponse.json();
          if (processData.status === 'failed') {
            throw new Error(
              processData.error_message ||
                'OCR could not extract any readable text from this document.'
            );
          }

          const uploadedAt = new Date().toISOString();
          setEntries((prev) =>
            prev.map((e) =>
              e.id === id
                ? { ...e, status: "success", progress: 100, uploadedAt, documentId }
                : e
            )
          );

          addUploadedDocument({
            id: documentId,
            name: entry.name,
            size: entry.size,
            type: entry.type,
            uploadedAt,
          });
          announce(`Uploaded and processed ${entry.name}`);
        } catch (err) {
          if (controller.signal.aborted) return;
          const errorMsg = err instanceof Error ? err.message : 'Processing error';
          setEntries((prev) =>
            prev.map((e) =>
              e.id === id
                ? { ...e, status: "error", error: errorMsg }
                : e
            )
          );
          announce(`Processing failed for ${entry.name}`);
        }
      } else {
        const errorMsg = backendErrorMessage(xhr.status, xhr.responseText);
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id
              ? { ...e, status: "error", error: errorMsg }
              : e
          )
        );
        announce(`Upload failed for ${entry.name}: ${errorMsg}`);
      }
      delete abortControllersRef.current[id];
    };

    xhr.onerror = () => {
      if (controller.signal.aborted) return;
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                status: "error",
                error:
                  "Cannot reach the server. Check that the backend is running and your connection is stable.",
              }
            : e
        )
      );
      announce(`Upload failed for ${entry.name}`);
      delete abortControllersRef.current[id];
    };

    xhr.ontimeout = () => {
      if (controller.signal.aborted) return;
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                status: "error",
                error: "Upload timed out. The file may be too large or the server is busy.",
              }
            : e
        )
      );
      announce(`Upload timed out for ${entry.name}`);
      delete abortControllersRef.current[id];
    };

    xhr.onabort = () => {
      delete abortControllersRef.current[id];
    };

    xhr.send(formData);
  };

  const cancelUpload = (id: string) => {
    if (abortControllersRef.current[id]) {
      abortControllersRef.current[id].abort();
      delete abortControllersRef.current[id];
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
    announce(`Cancelled upload`);
  };

  const retryUpload = (id: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: "idle", error: undefined, progress: 0 } : e)));
    setTimeout(() => startUpload(id), 200);
  };

  const removeEntry = (id: string) => {
    const entry = entriesRef.current.find((e) => e.id === id);
    const stableId = entry?.documentId ?? id;

    if (abortControllersRef.current[id]) {
      abortControllersRef.current[id].abort();
      delete abortControllersRef.current[id];
    }
    removeUploadedDocument(stableId);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const clearAll = () => {
    Object.values(abortControllersRef.current).forEach((c) => c.abort());
    abortControllersRef.current = {};
    clearUploadedDocuments();
    setEntries([]);
    announce("Cleared all files");
  };

  const successCount = entries.filter((e) => e.status === "success").length;

  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Upload documents</h1>
          <p className="mt-1 text-sm text-slate-600">
            Drag and drop files here, or use the button to select. Supports PDF, JPG, JPEG, PNG, and WebP. Max 50 MB per file.
          </p>
        </header>

        <section
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          aria-describedby="upload-instructions"
          className="relative rounded-2xl border border-slate-200 bg-white/40 p-6 backdrop-blur-md shadow-sm"
        >
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <div className="flex h-40 w-full flex-1 flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-slate-200 px-4 py-6 transition-colors duration-150 sm:h-44 sm:px-10"
                 style={{ background: dragActive ? 'linear-gradient(135deg, rgba(14,165,233,0.06), rgba(56,189,248,0.03))' : undefined }}>
              <UploadCloud className="h-10 w-10 text-teal-600" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-900">Drop files here</p>
                <p id="upload-instructions" className="mt-1 text-xs text-slate-600">or click to browse</p>
              </div>
              <div className="mt-3">
                <input
                  aria-hidden
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4" />
                  Select files
                </button>
              </div>
            </div>

            <div className="mt-4 w-full sm:mt-0 sm:w-1/2">
              <div className="rounded-lg bg-white/30 p-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-slate-700" />
                    <h3 className="text-sm font-medium text-slate-900">Upload summary</h3>
                  </div>
                  <div className="text-xs text-slate-600">{entries.length} file{entries.length !== 1 ? 's' : ''}</div>
                </div>

                <div className="mt-3 max-h-40 space-y-2 overflow-auto">
                  {entries.length === 0 ? (
                    <div className="rounded-md border border-slate-100 px-3 py-2 text-sm text-slate-600">No files queued</div>
                  ) : (
                    entries.map((e) => (
                      <div key={e.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 bg-white/60 px-3 py-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-50 text-slate-700">
                            {e.type.startsWith('image') ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-900">{e.name}</div>
                            <div className="mt-0.5 text-xs text-slate-500">{humanFileSize(e.size)}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-36">
                            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-200">
                              <div
                                className={`absolute left-0 top-0 h-2 ${e.status === 'error' ? 'bg-red-500' : 'bg-teal-600'}`}
                                style={{ width: `${Math.max(4, e.progress)}%` }}
                              />
                            </div>
                            <div className="mt-1 text-right text-[11px] text-slate-600">{e.status === 'uploading' ? `${e.progress}%` : e.status === 'success' ? 'Done' : e.status === 'error' ? 'Error' : ''}</div>
                          </div>

                          <div className="flex items-center gap-2">
                            {e.status === 'idle' && (
                              <button
                                title="Start"
                                onClick={() => startUpload(e.id)}
                                className="rounded-md px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                              >
                                Upload
                              </button>
                            )}
                            {e.status === 'uploading' && (
                              <button
                                title="Cancel"
                                onClick={() => cancelUpload(e.id)}
                                className="rounded-md px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                              >
                                Cancel
                              </button>
                            )}
                            {e.status === 'error' && (
                              <>
                                <button
                                  title="Retry"
                                  onClick={() => retryUpload(e.id)}
                                  className="rounded-md px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                                >
                                  Retry
                                </button>
                                <button
                                  title="Remove"
                                  onClick={() => removeEntry(e.id)}
                                  className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </>
                            )}
                            {e.status === 'success' && (
                              <div className="flex items-center gap-1 text-teal-700">
                                <CheckCircle className="h-4 w-4" />
                                <button title="View" onClick={() => router.push(`/documents/${e.documentId ?? e.id}`)} className="text-xs text-slate-700 hover:underline">View</button>
                                <button title="Remove" onClick={() => removeEntry(e.id)} className="text-xs text-red-600 hover:underline">Remove</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">{entries.filter(x => x.status==='uploading').length} uploading</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">{entries.filter(x => x.status==='error').length} errors</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={clearAll} className="rounded-md px-3 py-1 text-sm text-slate-700 hover:bg-slate-100">Clear</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Success banner */}
          {successCount > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-md bg-teal-600/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-teal-600" />
                <div>
                  <div className="text-sm font-medium text-teal-800">{successCount} file{successCount>1?'s':''} uploaded</div>
                  <div className="text-xs text-teal-700">Uploads completed successfully</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => router.push('/documents')} className="rounded-md bg-white/80 px-3 py-1 text-sm text-teal-700 hover:bg-white">View all</button>
                <button onClick={() => fileInputRef.current?.click()} className="rounded-md bg-teal-600 px-3 py-1 text-sm text-white hover:bg-teal-700">Upload more</button>
              </div>
            </div>
          )}

          {/* live region for announcements */}
          <div aria-live="polite" className="sr-only">
            {announcements.join(". ")}
          </div>
        </section>

        {/* detailed file table for larger screens */}
        <section className="mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white/40 p-4 backdrop-blur-md shadow-sm">
            <h2 className="text-sm font-medium text-slate-900">Uploaded files</h2>
            <p className="mt-1 text-xs text-slate-600">Files and metadata from recent uploads.</p>

            <div className="mt-4 overflow-auto">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="w-1/2">Name</th>
                    <th className="w-1/6">Size</th>
                    <th className="w-1/6">Type</th>
                    <th className="w-1/6">Uploaded</th>
                  </tr>
                </thead>
                <tbody className="mt-2 divide-y divide-slate-100">
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-sm text-slate-500">No uploaded files yet.</td>
                    </tr>
                  )}
                  {entries.map((e) => (
                    <tr key={e.id} className="align-top">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-md bg-slate-50 p-2 text-slate-700"><FileText className="h-4 w-4" /></div>
                          <div>
                            <div className="text-sm font-medium text-slate-900">{e.name}</div>
                            {e.error && <div className="text-xs text-red-600">{e.error}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-slate-700">{humanFileSize(e.size)}</td>
                      <td className="py-3 text-slate-700">{e.type || '—'}</td>
                      <td className="py-3 text-slate-700">{e.uploadedAt ? new Date(e.uploadedAt).toLocaleString() : (e.status === 'uploading' ? 'Uploading…' : '—')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => router.push('/documents')} className="rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">View in documents</button>
              <button onClick={() => clearAll()} className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100">Clear all</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
