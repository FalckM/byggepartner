// US-11 — Runs a test scenario (seed/scenarios.json) and checks expectations.
// Shared by Vitest and /admin/scenarier.
import { findJargon } from "./explain";
import { generate, type GenerateResult } from "./generate";
import type { ValidationReport } from "./report";
import type { Catalog, Game, Scenario } from "./types";
import { validate } from "./validate";

export interface ScenarioCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface ScenarioRun {
  id: string;
  status: "PASS" | "FAIL";
  checks: ScenarioCheck[];
  durationMs: number;
  report?: ValidationReport;
  generated?: GenerateResult;
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

export function checkGenerateExpectations(s: Scenario, res: GenerateResult, catalog: Catalog): ScenarioCheck[] {
  const e = s.expect;
  const checks: ScenarioCheck[] = [];
  if (e.reason) {
    checks.push({ name: `Svar: ${e.reason}`, passed: !res.ok && res.reason === e.reason, detail: res.ok ? `${res.packages.length} pakker` : res.message });
    if (!res.ok) checks.push({ name: "minimumNok > budsjett", passed: res.minimumNok > (s.needs?.budgetNok ?? 0), detail: `${res.minimumNok} kr` });
    return checks;
  }
  if (!res.ok) return [{ name: "Fant pakker", passed: false, detail: res.message }];
  const rec = res.packages.find((p) => p.tier === "RECOMMENDED");
  if (e.packages !== undefined) checks.push({ name: `${e.packages} pakker`, passed: res.packages.length === e.packages, detail: res.packages.map((p) => p.tier).join(", ") });
  if (e.ok !== undefined) checks.push({ name: "Alle pakker ok", passed: res.packages.every((p) => p.validation.ok) === e.ok, detail: res.packages.map((p) => `${p.tier}:${p.validation.ok}`).join(", ") });
  if (e.recommendedMaxNok !== undefined) checks.push({ name: `Anbefalt ≤ ${e.recommendedMaxNok}`, passed: !!rec && rec.totalNok <= e.recommendedMaxNok, detail: `${rec?.totalNok} kr` });
  for (const f of e.minFps ?? []) {
    const est = rec?.fps.find((x) => x.game === f.game && x.resolution === f.resolution);
    checks.push({ name: `${f.game} ≥ ${f.fps} fps`, passed: !!est && est.fps >= f.fps, detail: est ? `${est.low}–${est.high} (${est.fps})` : "mangler" });
  }
  for (const key of e.checklistPresent ?? []) {
    const item = rec?.validation.checklist.find((i) => i.key === key);
    checks.push({ name: `Sjekkliste ✅ ${key}`, passed: item?.status === "OK", detail: `status = ${item?.status ?? "–"}` });
  }
  if (e.noJargon) {
    const texts = res.packages.flatMap((p) => [
      ...Object.values(p.explanations),
      ...p.validation.results.map((r) => r.messagePlain),
      ...p.validation.checklist.map((i) => i.message),
    ]);
    const bad = texts.filter((t) => findJargon(t).length > 0);
    checks.push({ name: "Ingen fagord", passed: bad.length === 0, detail: bad[0] ?? "OK" });
  }
  if (e.gpuShareMin !== undefined && rec) {
    const gpuItem = rec.items.find((i) => i.category === "GPU");
    const gpu = catalog.find((c) => c.id === gpuItem?.componentId);
    const share = gpu ? gpu.priceNok / rec.totalNok : 0;
    checks.push({ name: `Skjermkort ≥ ${Math.round(e.gpuShareMin * 100)} %`, passed: share >= e.gpuShareMin, detail: `${Math.round(share * 100)} %` });
  }
  if (s.kind === "UPGRADE" && rec) {
    const owned = (s.needs?.existingParts ?? []).flatMap((p) => (p.componentId ? [p.componentId] : []));
    const kept = rec.items.filter((i) => i.owned).map((i) => i.componentId);
    const replaced = owned.filter((id) => !kept.includes(id));
    const allowed = new Set(["PSU", "COOLER", ...(s.upgradeCategories ?? [])]);
    const badReplace = replaced.filter((id) => !allowed.has(catalog.find((c) => c.id === id)?.category ?? ""));
    checks.push({ name: "Beholder eksisterende deler", passed: badReplace.length === 0, detail: replaced.length ? `byttet: ${replaced.join(", ")}` : "alle beholdt" });
    for (const cat of s.upgradeCategories ?? []) {
      const added = rec.items.some((i) => i.category === cat && !i.owned);
      checks.push({ name: `Ny ${cat}`, passed: added, detail: added ? "lagt til" : "mangler" });
    }
  }
  return checks;
}

export function runScenario(s: Scenario, catalog: Catalog, games: readonly Game[] = []): ScenarioRun {
  const t0 = performance.now();
  if (s.kind === "VALIDATE") {
    const report = validate(s.items ?? [], catalog, { includeOs: true });
    const checks = checkValidationExpectations(s, report);
    return finish(s.id, checks, t0, { report });
  }
  const needs = s.needs;
  if (!needs) return finish(s.id, [{ name: "Scenario har behov", passed: false }], t0, {});
  const generated = generate(needs, catalog, games, { upgradeCategories: s.upgradeCategories });
  const checks = checkGenerateExpectations(s, generated, catalog);
  const rec = generated.ok ? generated.packages.find((p) => p.tier === "RECOMMENDED") : undefined;
  return finish(s.id, checks, t0, { generated, report: rec?.validation });
}

function finish(id: string, checks: ScenarioCheck[], t0: number, extra: Partial<ScenarioRun>): ScenarioRun {
  return {
    id,
    status: checks.length > 0 && checks.every((c) => c.passed) ? "PASS" : "FAIL",
    checks,
    durationMs: performance.now() - t0,
    ...extra,
  };
}
