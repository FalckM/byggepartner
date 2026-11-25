"use client";
// US-14 — Expert mode: technical terms and numbers on demand (spec 9.1). Standard mode stays jargon-free.
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeLocalStorage } from "./safe-storage";

interface Prefs {
  expert: boolean;
  setExpert: (on: boolean) => void;
}

export const usePrefs = create<Prefs>()(
  persist((set) => ({ expert: false, setExpert: (expert) => set({ expert }) }), {
    name: "bp-prefs",
    storage: createJSONStorage(() => safeLocalStorage),
  }),
);

/** Expert flag that is false until hydrated (no SSR mismatch). */
export function useExpert(): boolean {
  const hydrated = useSyncExternalStore(
    (cb) => usePrefs.persist.onFinishHydration(cb),
    () => usePrefs.persist.hasHydrated(),
    () => false,
  );
  const expert = usePrefs((s) => s.expert);
  return hydrated && expert;
}
