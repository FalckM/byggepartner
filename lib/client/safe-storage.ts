// localStorage can throw (private mode, blocked site data) – never let that break the shop.
import type { StateStorage } from "zustand/middleware";

export const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* ignore */
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

/** Anonymous visitor id (spec 11: no IP, no third-party tracking). */
export function anonymousId(): string {
  const KEY = "bp-anon-id";
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = `anon-${crypto.randomUUID().slice(0, 12)}`;
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anon-ephemeral";
  }
}
