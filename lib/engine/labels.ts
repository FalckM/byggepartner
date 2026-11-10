// DP1, US-08 — Plain-language Norwegian labels. Pure TS (no UI imports).
import type { Category, Stock } from "./types";

/** Short label used in tables and lists. */
export const CATEGORY_LABEL: Record<Category, string> = {
  CPU: "Prosessor",
  MOTHERBOARD: "Hovedkort",
  RAM: "Minne",
  GPU: "Skjermkort",
  STORAGE: "Lagring",
  PSU: "Strømforsyning",
  CASE: "Kabinett",
  COOLER: "CPU-kjøler",
  OS: "Operativsystem",
  ACCESSORY: "Tilbehør",
};

/** Label with a plain explanation, for standard (non-expert) mode – spec 9.1. */
export const CATEGORY_LABEL_PLAIN: Record<Category, string> = {
  CPU: "Prosessor (hjernen)",
  MOTHERBOARD: "Hovedkort (kobler alt sammen)",
  RAM: "Minne (korttidshukommelsen)",
  GPU: "Skjermkort (grafikken i spill)",
  STORAGE: "Lagring (der filer og spill bor)",
  PSU: "Strømforsyning",
  CASE: "Kabinett (kassen)",
  COOLER: "CPU-kjøler (holder prosessoren kald)",
  OS: "Operativsystem (Windows)",
  ACCESSORY: "Tilbehør",
};

export const STOCK_LABEL: Record<Stock, string> = {
  IN_STOCK: "På lager",
  LOW: "Få igjen",
  ORDER: "Bestillingsvare",
  OUT: "Utsolgt",
};

const nok = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 });
/** 14000 → "14 000 kr" */
export function formatNok(value: number): string {
  return `${nok.format(value)} kr`;
}
