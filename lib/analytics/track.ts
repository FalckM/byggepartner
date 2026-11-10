"use client";
// H1–H3, US-16 — Client event logger. Batches events to /api/events (anonymous id only, no IP, no third parties).
import type { ClientEvent, EventType } from "./events";
import { anonymousId } from "@/lib/client/safe-storage";
import { activeSessionId } from "@/lib/client/test-session";

export type { EventType } from "./events";

declare global {
  interface Window {
    __bpEvents?: ClientEvent[];
  }
}

const FLUSH_MS = 1500;
const queue: ClientEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

function send(events: ClientEvent[], beacon: boolean): Promise<unknown> | undefined {
  if (!events.length) return;
  const body = JSON.stringify({ anonymousId: anonymousId(), sessionId: activeSessionId(), events });
  try {
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
      return;
    }
    return fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    /* analytics must never break the shop */
  }
}

/** Send everything queued now (also used before navigating away / ending a test session). */
export function flush(beacon = false): void {
  if (timer) clearTimeout(timer);
  timer = null;
  while (queue.length) send(queue.splice(0, 50), beacon);
}

/** Like flush(), but resolves when the server has stored the events (before ending a test session). */
export async function flushNow(): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  const pending: Promise<unknown>[] = [];
  while (queue.length) {
    const p = send(queue.splice(0, 50), false);
    if (p) pending.push(p);
  }
  await Promise.all(pending);
}

export function track(type: EventType, payload: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  const event: ClientEvent = { type, payload, ts: Date.now() };
  (window.__bpEvents ??= []).push(event); // handy for debugging and tests
  queue.push(event);
  if (!listening) {
    listening = true;
    window.addEventListener("pagehide", () => flush(true));
    document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush(true));
  }
  if (!timer) timer = setTimeout(() => flush(false), FLUSH_MS);
}
