// US-11 — Runs a test scenario (seed/scenarios.json) and checks expectations.
// Shared by Vitest and /admin/scenarier. GENERATE/UPGRADE run once the generator exists (phase 3).
import type { ValidationReport } from "./report";
import type { Catalog, Scenario } from "./types";
import { validate } from "./validate";

export interface ScenarioCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface ScenarioRun {
  id: string;
  status: "PASS" | "FAIL" | "PENDING";
  checks: ScenarioCheck[];
  durationMs: number;
  report?: ValidationReport;
}

export function checkValidationExpectations(s: Scenario, report: ValidationReport): ScenarioCheck[] {
  const e = s.expect;
  const checks: ScenarioCheck[] = [];
  const failed = (sev: string) =>
    new Set<string>(report.results.filter((r) => !r.passed && r.severity === sev).map((r) => r.ruleId));
  const errors = failed("ERROR");
  const warnings = failed("WARNING");

  if (e.ok !== undefined) checks.push({ name: `ok = ${e.ok}`, passed: report.ok === e.ok, detail: `ok = ${report.ok}` });
  for (const id of e.errorRules ?? [])
    checks.push({ name: `${id} ERROR`, passed: errors.has(id), detail: `ERROR: ${[...errors].join(", ") || "ingen"}` });
  for (const id of e.warningRules ?? [])
    checks.push({ name: `${id} WARNING`, passed: warnings.has(id), detail: `WARNING: ${[...warnings].join(", ") || "ingen"}` });
  for (const key of e.checklistMissing ?? []) {
    const item = report.checklist.find((i) => i.key === key);
    checks.push({ name: `Sjekkliste ❌ ${key}`, passed: item?.status === "MISSING", detail: `status = ${item?.status ?? "–"}` });
  }
  for (const key of e.checklistPresent ?? []) {
    const item = report.checklist.find((i) => i.key === key);
    checks.push({ name: `Sjekkliste ✅ ${key}`, passed: item?.status === "OK", detail: `status = ${item?.status ?? "–"}` });
  }
  if (e.hasFixSuggestion) {
    const withFix = report.results.filter(
      (r) => !r.passed && r.severity === "ERROR" && (r.fixSuggestion?.candidateIds?.length ?? 0) > 0,
    );
    checks.push({
      name: "Fiks-forslag med kandidater",
      passed: withFix.length > 0,
      detail: withFix.map((r) => `${r.ruleId}: ${r.fixSuggestion?.candidateIds?.join(", ")}`).join("; ") || "ingen",
    });
  }
  return checks;
}

export function runScenario(s: Scenario, catalog: Catalog): ScenarioRun {
  const t0 = performance.now();
  if (s.kind !== "VALIDATE") {
    return {
      id: s.id,
      status: "PENDING",
      checks: [{ name: "Generator (fase 3)", passed: false, detail: "Ikke implementert ennå" }],
      durationMs: 0,
    };
  }
  const report = validate(s.items ?? [], catalog, { includeOs: true });
  const checks = checkValidationExpectations(s, report);
  return {
    id: s.id,
    status: checks.length > 0 && checks.every((c) => c.passed) ? "PASS" : "FAIL",
    checks,
    durationMs: performance.now() - t0,
    report,
  };
}
