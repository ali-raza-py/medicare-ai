// Demo-mode client-side store for uploaded documents.
// Persists upload metadata to localStorage so uploads survive page navigation.
// Replaced by real backend data once API integration is complete — no real
// patient files are stored here, only metadata (name, size, type, timestamp).

import { useEffect, useState } from "react";
import { DEMO_DOCUMENTS, type DemoDocument } from "./demo-data";

export type UploadedDocument = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string; // ISO timestamp
};

const STORAGE_KEY = "medcare-uploaded-documents";
const CHANGE_EVENT = "medcare-uploads-changed";

const listeners = new Set<() => void>();

export function getUploadedDocuments(): UploadedDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as UploadedDocument[]) : [];
  } catch {
    return [];
  }
}

function persist(docs: UploadedDocument[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch {
    // storage full / blocked — demo mode, ignore silently
  }
  listeners.forEach((l) => l());
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function addUploadedDocument(doc: UploadedDocument) {
  persist([doc, ...getUploadedDocuments()]);
}

export function removeUploadedDocument(id: string) {
  persist(getUploadedDocuments().filter((d) => d.id !== id));
}

export function clearUploadedDocuments() {
  persist([]);
}

export function subscribeToUploadedDocuments(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

// Convert stored upload metadata into the DemoDocument shape the UI uses.
export function uploadedToDemoDocument(d: UploadedDocument): DemoDocument {
  return {
    id: d.id,
    name: d.name,
    kind: "report",
    date: new Date(d.uploadedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }),
    pages: 1,
    status: "processed",
    flag: "normal",
  };
}

// Uploaded documents first (newest on top), then the built-in demo library.
export function getAllDocuments(): DemoDocument[] {
  return [...getUploadedDocuments().map(uploadedToDemoDocument), ...DEMO_DOCUMENTS];
}

// React hook: live list of uploaded documents (re-renders on any change).
export function useUploadedDocuments(): UploadedDocument[] {
  const [docs, setDocs] = useState<UploadedDocument[]>([]);

  useEffect(() => {
    const update = () => setDocs(getUploadedDocuments());
    update();
    window.addEventListener(CHANGE_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(CHANGE_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return docs;
}
