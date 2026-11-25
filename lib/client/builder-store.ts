"use client";
// US-14 — Free-build state (separate from the cart), persisted with safe localStorage.
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { BuildItem, Category } from "@/lib/engine/types";
import { safeLocalStorage } from "./safe-storage";

/** Categories where you add more than one (drives, accessories); all others are replaced. */
export const MULTI: Category[] = ["STORAGE", "ACCESSORY"];

/** A valid, complete starting point (AM5, mATX) – handy for demos and tests. */
export const EXAMPLE_BUILD: BuildItem[] = [
  { category: "CPU", componentId: "cpu-amd-ryzen-5-7600", qty: 1 },
  { category: "MOTHERBOARD", componentId: "mb-b850m-wifi", qty: 1 },
  { category: "RAM", componentId: "ram-ddr5-32-6000", qty: 1 },
  { category: "GPU", componentId: "gpu-rtx-5060-compact", qty: 1 },
  { category: "STORAGE", componentId: "ssd-nvme-1tb-gen4", qty: 1 },
  { category: "PSU", componentId: "psu-850-gold-atx31", qty: 1 },
  { category: "CASE", componentId: "case-midtower-mesh", qty: 1 },
  { category: "OS", componentId: "os-windows-11-home", qty: 1 },
];

interface BuilderState {
  items: BuildItem[];
  pick: (item: BuildItem) => void;
  replace: (oldId: string, item: BuildItem) => void;
  add: (item: BuildItem) => void;
  remove: (id: string) => void;
  load: (items: BuildItem[]) => void;
}

export const useBuilder = create<BuilderState>()(
  persist(
    (set) => ({
      items: [],
      pick: (item) =>
        set((s) =>
          MULTI.includes(item.category)
            ? { items: s.items.some((i) => i.componentId === item.componentId) ? s.items : [...s.items, item] }
            : { items: [...s.items.filter((i) => i.category !== item.category), item] },
        ),
      replace: (oldId, item) => set((s) => ({ items: s.items.map((i) => (i.componentId === oldId ? item : i)) })),
      add: (item) => set((s) => ({ items: s.items.some((i) => i.componentId === item.componentId) ? s.items : [...s.items, item] })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.componentId !== id) })),
      load: (items) => set({ items }),
    }),
    { name: "bp-builder", storage: createJSONStorage(() => safeLocalStorage), version: 1 },
  ),
);

export function useBuilderHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useBuilder.persist.onFinishHydration(cb),
    () => useBuilder.persist.hasHydrated(),
    () => false,
  );
}
