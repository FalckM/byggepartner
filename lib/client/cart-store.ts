"use client";
// DP3, DP4, US-10 — Cart state (client), persisted to localStorage via a try/catch wrapper.
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { BuildItem, NeedsProfile } from "@/lib/engine/types";
import { safeLocalStorage } from "./safe-storage";

export type CartTier = "SAVE" | "RECOMMENDED" | "PERFORMANCE" | "CUSTOM" | "UPGRADE";
export const ASSEMBLY_ID = "acc-assembly-service";

interface CartState {
  items: BuildItem[];
  needs?: NeedsProfile;
  tier: CartTier;
  /** Build the cart came from (share links / analytics). */
  sourceBuildId?: string;
  setPackage: (p: { items: BuildItem[]; needs?: NeedsProfile; tier: CartTier; sourceBuildId?: string }) => void;
  setItems: (items: BuildItem[]) => void;
  addItem: (item: BuildItem) => void;
  removeItem: (componentId: string) => void;
  replaceItem: (oldId: string, item: BuildItem) => void;
  setAssembly: (on: boolean) => void;
  clear: () => void;
}

const markCustom = (tier: CartTier): CartTier => (tier === "UPGRADE" ? "UPGRADE" : "CUSTOM");

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      tier: "CUSTOM",
      setPackage: ({ items, needs, tier, sourceBuildId }) => set({ items, needs, tier, sourceBuildId }),
      setItems: (items) => set((s) => ({ items, tier: markCustom(s.tier) })),
      addItem: (item) =>
        set((s) => ({
          items: s.items.some((i) => i.componentId === item.componentId) ? s.items : [...s.items, item],
          tier: markCustom(s.tier),
        })),
      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.componentId !== id), tier: markCustom(s.tier) })),
      replaceItem: (oldId, item) =>
        set((s) => ({ items: s.items.map((i) => (i.componentId === oldId ? item : i)), tier: markCustom(s.tier) })),
      setAssembly: (on) =>
        set((s) => ({
          items: on
            ? s.items.some((i) => i.componentId === ASSEMBLY_ID)
              ? s.items
              : [...s.items, { category: "ACCESSORY", componentId: ASSEMBLY_ID, qty: 1 }]
            : s.items.filter((i) => i.componentId !== ASSEMBLY_ID),
          needs: s.needs ? { ...s.needs, assemblyService: on } : s.needs,
        })),
      clear: () => set({ items: [], needs: undefined, tier: "CUSTOM", sourceBuildId: undefined }),
    }),
    { name: "bp-cart", storage: createJSONStorage(() => safeLocalStorage), version: 1 },
  ),
);

/** true once the persisted cart has been read (avoids SSR/hydration mismatch). */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useCart.persist.onFinishHydration(cb),
    () => useCart.persist.hasHydrated(),
    () => false,
  );
}
