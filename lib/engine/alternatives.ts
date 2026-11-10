// DP2, US-07 — Compatible alternatives when swapping a part (spec 7.5).
import { buildContext, catalogIndex } from "./context";
import type { AlternativeCandidate, AlternativesResult, IncompatibleCandidate, ValidateOptions } from "./report";
import type { AccessoryKind, BuildItem, BuildItems, Catalog, Category, Component } from "./types";
import { runRules } from "./validate";

export interface AlternativesOptions {
  /** Which item to swap out. Defaults to the first item of `category`; none → candidates are additions. */
  replaceComponentId?: string;
  /** Restrict ACCESSORY candidates to one kind (paste, Wi-Fi …). Defaults to the replaced item's kind. */
  accessoryKind?: AccessoryKind;
  validateOptions?: ValidateOptions;
}

/** Category-specific "performance" used for perfDeltaPct and value sorting. */
export function perfValue(c: Component): number | null {
  switch (c.category) {
    case "CPU":
      return c.specs.perfScoreGaming * 0.7 + c.specs.perfScoreMulti * 0.3;
    case "GPU":
      return c.specs.perfScore;
    case "RAM":
      return c.specs.capacityGbTotal;
    case "STORAGE":
      return c.specs.capacityGb;
    default:
      return null;
  }
}

export function compatibleAlternatives(
  items: BuildItems,
  category: Category,
  catalog: Catalog,
  opts: AlternativesOptions = {},
): AlternativesResult {
  const idx = catalogIndex(catalog);
  const replaceId =
    opts.replaceComponentId ?? items.find((i) => i.category === category)?.componentId;
  const current = replaceId ? idx.get(replaceId) : undefined;
  const replacedIndex = replaceId ? items.findIndex((i) => i.componentId === replaceId) : -1;
  const qty = replacedIndex >= 0 ? (items[replacedIndex].qty ?? 1) : 1;
  const base: BuildItem[] = items.filter((_, i) => i !== replacedIndex);
  const kind =
    opts.accessoryKind ?? (current?.category === "ACCESSORY" ? current.specs.kind : undefined);

  const compatible: AlternativeCandidate[] = [];
  const incompatible: IncompatibleCandidate[] = [];
  const curPerf = current ? perfValue(current) : null;

  for (const c of catalog) {
    if (c.category !== category || c.id === replaceId || c.incompleteForValidation) continue;
    if (kind && c.category === "ACCESSORY" && c.specs.kind !== kind) continue;
    if (c.stock === "OUT") {
      incompatible.push({ component: c, reasons: ["Utsolgt for øyeblikket."], ruleIds: [] });
      continue;
    }
    const ctx = buildContext([...base, { category, componentId: c.id, qty }], catalog, opts.validateOptions);
    const results = runRules(ctx).filter((r) => !r.passed && r.involved.includes(c.id));
    const errors = results.filter((r) => r.severity === "ERROR");
    if (errors.length) {
      incompatible.push({
        component: c,
        reasons: [...new Set(errors.map((r) => r.messagePlain))],
        ruleIds: [...new Set(errors.map((r) => r.ruleId))],
      });
      continue;
    }
    const p = perfValue(c);
    compatible.push({
      component: c,
      priceDeltaNok: c.priceNok - (current?.priceNok ?? 0),
      perfDeltaPct: p !== null && curPerf ? Math.round(((p - curPerf) / curPerf) * 100) : 0,
      warnings: results.filter((r) => r.severity === "WARNING"),
      notes: results.filter((r) => r.severity === "INFO"),
    });
  }

  compatible.sort((a, b) => {
    const w = a.warnings.length - b.warnings.length;
    if (w) return w;
    const pa = perfValue(a.component);
    const pb = perfValue(b.component);
    if (pa !== null && pb !== null) {
      const v = pb / b.component.priceNok - pa / a.component.priceNok; // performance per krone
      if (Math.abs(v) > 1e-9) return v;
    }
    return a.component.priceNok - b.component.priceNok || a.component.id.localeCompare(b.component.id);
  });
  incompatible.sort((a, b) => a.component.priceNok - b.component.priceNok);
  return { compatible, incompatible };
}
