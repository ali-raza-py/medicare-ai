"use client";

import { useSyncExternalStore } from "react";
import {
  SESSION_EVENT,
  SESSION_KEY,
  type MedCareUser,
} from "@/lib/auth";

// The session lives in localStorage (an external store), so it is read via
// useSyncExternalStore: React uses the server snapshot during hydration and
// switches to the live value afterwards without a hydration mismatch.

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SESSION_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SESSION_EVENT, callback);
  };
}

function getSnapshot(): string | null {
  return window.localStorage.getItem(SESSION_KEY);
}

function getServerSnapshot(): string | null {
  return null;
}

export function useSession(): MedCareUser | null {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MedCareUser;
    return parsed?.email ? parsed : null;
  } catch {
    return null;
  }
}
