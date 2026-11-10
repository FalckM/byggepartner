// DP2, DP3, DP4, US-04/05/06 — Runs every rule + checklist → ValidationReport (spec 7.1).
// `ok === true` is the ONLY condition for showing «Alt passer sammen».
import { compatibleAlternatives } from "./alternatives";
import { buildChecklist, checklistComplete } from "./checklist";
import { buildContext, catalogIndex, totalNok, type BuildContext } from "./context";
import { powerReport } from "./power";
import type { RuleResult, ValidateOptions, ValidationReport } from "./report";
import { RULES } from "./rules";
import type { BuildItems, Catalog } from "./types";

/** Rules only – no checklist, no fix candidates. Used by alternatives and the generator. */
export function runRules(ctx: BuildContext): RuleResult[] {
  const results: RuleResult[] = ctx.unknownIds.map((id) => ({
    ruleId: "R00_UNKNOWN_COMPONENT" as const,
    severity: "ERROR" as const,
    passed: false,
    involved: [id],
    messagePlain: "En av delene finnes ikke lenger i katalogen. Fjern den og velg en ny.",
    messageTechnical: `Ukjent komponent-id eller feil kategori: ${id}`,
  }));
  for (const rule of RULES) results.push(...rule.check(ctx));
  return results;
}

export function hasBlockingError(results: RuleResult[]): boolean {
  return results.some((r) => !r.passed && r.severity === "ERROR");
}

export function validate(items: BuildItems, catalog: Catalog, options?: ValidateOptions): ValidationReport {
  const ctx = buildContext(items, catalog, options);
  const results = runRules(ctx);
  const idx = catalogIndex(catalog);

  // Fill one-click-fix candidates for blocking errors and warnings.
  for (const r of results) {
    const fix = r.fixSuggestion;
    if (r.passed || r.severity === "INFO" || !fix || fix.candidateIds || fix.action === "REMOVE") continue;
    const replaceComponentId =
      fix.action === "REPLACE" ? r.involved.find((id) => idx.get(id)?.category === fix.category) : undefined;
    fix.candidateIds = compatibleAlternatives(items, fix.category, catalog, {
      replaceComponentId,
      validateOptions: options,
    })
      .compatible.filter((c) => c.warnings.every((w) => w.ruleId !== r.ruleId))
      // A fix should feel like a like-for-like swap: fewest warnings, then closest in price.
      .sort(
        (a, b) =>
          a.warnings.length - b.warnings.length || Math.abs(a.priceDeltaNok) - Math.abs(b.priceDeltaNok),
      )
      .slice(0, 5)
      .map((c) => c.component.id);
  }

  const checklist = buildChecklist(ctx, (category, accessoryKind) =>
    compatibleAlternatives(items, category, catalog, {
      replaceComponentId: "__none__",
      accessoryKind,
      validateOptions: options,
    })
      // "Legg til anbefalt" must not create a new gap (e.g. a cooler that then needs paste).
      .compatible.filter((c) => c.warnings.length === 0 && c.notes.length === 0)
      .sort((a, b) => a.component.priceNok - b.component.priceNok)
      .map((c) => c.component.id),
  );

  return {
    ok: !hasBlockingError(results) && checklistComplete(checklist),
    results,
    checklist,
    power: powerReport(ctx),
    totalNok: totalNok(ctx),
    rulesChecked: new Set(results.map((r) => r.ruleId)).size,
  };
}
