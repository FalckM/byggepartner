// H1–H3, US-16 — Event vocabulary (spec 11). Shared by client logger, API and metrics (pure).
import { z } from "zod";

export const EVENT_TYPES = [
  "wizard_step_viewed",
  "wizard_step_completed",
  "wizard_completed",
  "package_viewed",
  "tier_selected",
  "part_swap_opened",
  "part_swapped",
  "explanation_opened",
  "validation_error_shown",
  "checklist_fix_clicked",
  "cart_viewed",
  "cart_green_check_shown",
  "checkout_started",
  "checkout_completed",
  "cart_abandoned",
  "expert_mode_toggled",
  "ask_builder_opened",
] as const;
export const EventTypeSchema = z.enum(EVENT_TYPES);
export type EventType = z.infer<typeof EventTypeSchema>;

export const ClientEventSchema = z.object({
  type: EventTypeSchema,
  payload: z.record(z.string(), z.unknown()).default({}),
  ts: z.number().int().positive(),
});
export type ClientEvent = z.infer<typeof ClientEventSchema>;

export const EventBatchSchema = z.object({
  anonymousId: z.string().min(1).max(64),
  sessionId: z.string().max(64).optional(),
  events: z.array(ClientEventSchema).min(1).max(50),
});

export const SEGMENTS = ["Førstegangskjøper", "Foresatt", "Lavbudsjett", "Oppgraderer", "Erfaren", "Annet"] as const;

export const DEFAULT_TASK = "Du har 14 000 kr og vil ha en PC til CS2 og studier. Finn en PC og legg den i handlekurven.";
