"use client";
// US-16 — Moderator test session, kept in localStorage so it survives navigation within the shop.
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeLocalStorage } from "./safe-storage";

export interface ActiveSession {
  id: string;
  participantCode: string;
  segment: string;
  task: string;
  startedAt: number;
  /** Set when checkout completes during the session. */
  orderId?: string;
}

interface TestSessionState {
  session: ActiveSession | null;
  start: (s: ActiveSession) => void;
  markCompleted: (orderId: string) => void;
  end: () => void;
}

export const useTestSession = create<TestSessionState>()(
  persist(
    (set) => ({
      session: null,
      start: (session) => set({ session }),
      markCompleted: (orderId) => set((s) => (s.session ? { session: { ...s.session, orderId } } : s)),
      end: () => set({ session: null }),
    }),
    { name: "bp-test-session", storage: createJSONStorage(() => safeLocalStorage) },
  ),
);

export function useTestSessionHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useTestSession.persist.onFinishHydration(cb),
    () => useTestSession.persist.hasHydrated(),
    () => false,
  );
}

/** Read without React (used by the event logger). */
export function activeSessionId(): string | undefined {
  try {
    const raw = window.localStorage.getItem("bp-test-session");
    return raw ? (JSON.parse(raw).state?.session?.id ?? undefined) : undefined;
  } catch {
    return undefined;
  }
}
