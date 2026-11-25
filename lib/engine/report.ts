// DP2, DP3, DP4, US-04/05/06 — Output contract of the compatibility engine (spec 7.1).
// PURE TypeScript: no imports from next, prisma or react.
import type { Category, Component } from "./types";

export type Severity = "ERROR" | "WARNING" | "INFO";

export type RuleId =
  | "R00_UNKNOWN_COMPONENT"
  | "R01_SOCKET"
  | "R02_MEMORY_TYPE"
  | "R03_GPU_LENGTH"
  | "R04_COOLER_HEIGHT"
  | "R05_COOLER_SOCKET"
  | "R06_COOLER_CAPACITY"
  | "R07_RADIATOR_FIT"
  | "R08_FORM_FACTOR"
  | "R09_PSU_FORM"
  | "R10_PSU_WATTAGE"
  | "R11_PSU_CONNECTORS"
  | "R12_RAM_SLOTS"
  | "R13_M2_SLOTS"
  | "R14_SATA"
  | "R15_DISPLAY_OUTPUT"
  | "R16_BIOS"
  | "R17_RAM_HEIGHT"
  | "R18_THERMAL_PASTE"
  | "R19_DUPLICATE_SINGLETON";

export interface FixSuggestion {
  action: "REPLACE" | "ADD" | "REMOVE";
  category: Category;
  candidateIds?: string[];
}

export interface RuleResult {
  ruleId: RuleId;
  severity: Severity;
  /** false = the rule found a problem (of `severity`). Only failed ERRORs block. */
  passed: boolean;
  involved: string[];
  /** Plain Norwegian for customers – no unexplained jargon (spec 9.1). */
  messagePlain: string;
  /** Expert mode – with numbers. */
  messageTechnical: string;
  fixSuggestion?: FixSuggestion;
}

export type ChecklistStatus = "OK" | "WARN" | "MISSING";
export type ChecklistKey = Category | "THERMAL_PASTE" | "WIFI";

export interface ChecklistItem {
  key: ChecklistKey;
  /** Category to add from when fixing this item. */
  category: Category;
  label: string;
  status: ChecklistStatus;
  required: boolean;
  message: string;
  /** Component ids in the build that satisfy this item. */
  satisfiedBy: string[];
  /** "Legg til anbefalt" – compatible candidates, best first. */
  recommendedIds?: string[];
}

export type PowerStatus = "NO_PSU" | "TOO_WEAK" | "TIGHT" | "GOOD";

export interface PowerReport {
  lastW: number;
  anbefaltW: number;
  psuW: number | null;
  /** (psuW − lastW) / lastW in percent, rounded. null without PSU. */
  marginPct: number | null;
  status: PowerStatus;
}

export interface ValidationReport {
  /** true ONLY if 0 failed ERRORs and the checklist is complete — sole condition for the green check (DP4). */
  ok: boolean;
  results: RuleResult[];
  checklist: ChecklistItem[];
  power: PowerReport;
  totalNok: number;
  /** Number of distinct rules evaluated ("vi har sjekket 19 ting"). */
  rulesChecked: number;
}

export interface ValidateOptions {
  /** Customer wants Windows included (default true). false → OS item is a reminder, not required. */
  includeOs?: boolean;
  /** Customer asked for Wi-Fi. */
  wantsWifi?: boolean;
  /** Build is for gaming → a graphics card is required even with iGPU. */
  gaming?: boolean;
}

export interface AlternativeCandidate {
  component: Component;
  priceDeltaNok: number;
  /** Relative change in the category's performance metric, in percent. */
  perfDeltaPct: number;
  warnings: RuleResult[];
  /** Non-blocking INFO findings (e.g. "needs thermal paste"). */
  notes: RuleResult[];
}

export interface IncompatibleCandidate {
  component: Component;
  reasons: string[];
  ruleIds: RuleId[];
}

export interface AlternativesResult {
  compatible: AlternativeCandidate[];
  incompatible: IncompatibleCandidate[];
}
