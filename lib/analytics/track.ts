"use client";
// H1–H3, US-16 — Analytics event logger. Phase 6 adds the /api/events endpoint and test sessions;
// until then events are buffered in memory (window.__bpEvents) so call sites are already in place.
export type EventType =
  | "wizard_step_viewed"
  | "wizard_step_completed"
  | "wizard_completed"
  | "package_viewed"
  | "tier_selected"
  | "part_swap_opened"
  | "part_swapped"
  | "explanation_opened"
  | "validation_error_shown"
  | "checklist_fix_clicked"
  | "cart_viewed"
  | "cart_green_check_shown"
  | "checkout_started"
  | "checkout_completed"
  | "cart_abandoned"
  | "expert_mode_toggled"
  | "ask_builder_opened";

export interface TrackedEvent {
  type: EventType;
  payload: Record<string, unknown>;
  ts: number;
}

declare global {
  interface Window {
    __bpEvents?: TrackedEvent[];
  }
}

export function track(type: EventType, payload: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  (window.__bpEvents ??= []).push({ type, payload, ts: Date.now() });
}
