// Shared fixtures for engine tests: real seed catalog + synthetic variants for boundary cases.
import { loadSeedCatalog } from "@/lib/data/seedData";
import { buildContext, type BuildContext } from "@/lib/engine/context";
import type { RuleResult, ValidateOptions } from "@/lib/engine/report";
import type { Rule } from "@/lib/engine/rules";
import type { BuildItem, Component } from "@/lib/engine/types";

export const seed: Component[] = loadSeedCatalog();
const byId = new Map(seed.map((c) => [c.id, c]));

export function comp(id: string): Component {
  const c = byId.get(id);
  if (!c) throw new Error(`unknown test component ${id}`);
  return c;
}

/** Clone a seed component with patched specs under a new id (`<id>--<suffix>`). */
export function variant(id: string, suffix: string, specs: Record<string, unknown>, extra: Partial<Component> = {}): Component {
  const base = comp(id);
  return { ...base, ...extra, id: `${id}--${suffix}`, specs: { ...base.specs, ...specs } } as Component;
}

/** Ids → build items. `id*2` means qty 2. Extra (synthetic) components are resolved too. */
export function items(ids: string[], extra: Component[] = []): BuildItem[] {
  const all = new Map([...byId, ...extra.map((c) => [c.id, c] as const)]);
  return ids.map((raw) => {
    const [id, q] = raw.split("*");
    const c = all.get(id);
    if (!c) throw new Error(`unknown test component ${id}`);
    return { category: c.category, componentId: id, qty: q ? Number(q) : 1 };
  });
}

export function catalogWith(extra: Component[] = []): Component[] {
  return extra.length ? [...seed, ...extra] : seed;
}

export function ctxOf(ids: string[], extra: Component[] = [], options?: ValidateOptions): BuildContext {
  return buildContext(items(ids, extra), catalogWith(extra), options);
}

export function run(rule: Rule, ids: string[], extra: Component[] = []): RuleResult[] {
  return rule.check(ctxOf(ids, extra));
}

export const failed = (rs: RuleResult[]) => rs.filter((r) => !r.passed);

/** A complete, valid AM5 build used as the "known good" baseline. */
export const BASE = {
  cpu: "cpu-amd-ryzen-5-7600",
  mb: "mb-b650-atx-wifi",
  ram: "ram-ddr5-32-6000",
  gpu: "gpu-rtx-5060-compact",
  ssd: "ssd-nvme-1tb-gen4",
  psu: "psu-650-gold-atx31",
  case: "case-midtower-mesh",
  os: "os-windows-11-home",
} as const;

export const BASE_IDS: string[] = Object.values(BASE);

/** BASE with some slots replaced/removed: `swap(BASE_IDS, { gpu: "x", os: null })`. */
export function baseWith(changes: Partial<Record<keyof typeof BASE, string | null>>, add: string[] = []): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(BASE) as [keyof typeof BASE, string][]) {
    const c = k in changes ? changes[k] : v;
    if (c) out.push(c);
  }
  return [...out, ...add];
}
