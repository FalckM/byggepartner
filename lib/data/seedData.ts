// DP2, US-04, US-11 — Loads and validates the curated seed data (chapter 10).
// Used by the DB seed script, staticSource (tests) and the scenario runner.
// Relative imports only: this file is executed by tsx outside Next.js.
import { z } from "zod";
import {
  ComponentSchema,
  GameSchema,
  ScenarioSchema,
  type Component,
  type Game,
  type Scenario,
} from "../engine/types";

import cpu from "../../seed/components/cpu.json";
import motherboard from "../../seed/components/motherboard.json";
import ram from "../../seed/components/ram.json";
import gpu from "../../seed/components/gpu.json";
import storage from "../../seed/components/storage.json";
import psu from "../../seed/components/psu.json";
import pcCase from "../../seed/components/case.json";
import cooler from "../../seed/components/cooler.json";
import os from "../../seed/components/os.json";
import accessory from "../../seed/components/accessory.json";
import games from "../../seed/games.json";
import scenarios from "../../seed/scenarios.json";

export const RAW_COMPONENT_FILES: Record<string, unknown[]> = {
  "cpu.json": cpu,
  "motherboard.json": motherboard,
  "ram.json": ram,
  "gpu.json": gpu,
  "storage.json": storage,
  "psu.json": psu,
  "case.json": pcCase,
  "cooler.json": cooler,
  "os.json": os,
  "accessory.json": accessory,
};

export class SeedValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Seed data is invalid (${issues.length} issue(s)):\n- ${issues.join("\n- ")}`);
    this.name = "SeedValidationError";
  }
}

/** Parse every seed file; collect ALL issues (not just the first) for a useful report. */
export function loadSeedCatalog(): Component[] {
  const issues: string[] = [];
  const out: Component[] = [];
  const seen = new Set<string>();

  for (const [file, rows] of Object.entries(RAW_COMPONENT_FILES)) {
    rows.forEach((row, i) => {
      const res = ComponentSchema.safeParse(row);
      const label = `${file}[${i}]${isObjWithId(row) ? ` (${row.id})` : ""}`;
      if (!res.success) {
        issues.push(`${label}: ${z.prettifyError(res.error).replace(/\n/g, " ")}`);
        return;
      }
      if (seen.has(res.data.id)) issues.push(`${label}: duplicate id`);
      seen.add(res.data.id);
      out.push(res.data);
    });
  }

  if (issues.length) throw new SeedValidationError(issues);
  return out;
}

export function loadSeedGames(): Game[] {
  return z.array(GameSchema).parse(games);
}

export function loadSeedScenarios(): Scenario[] {
  return z.array(ScenarioSchema).parse(scenarios);
}

function isObjWithId(v: unknown): v is { id: string } {
  return typeof v === "object" && v !== null && typeof (v as { id?: unknown }).id === "string";
}
