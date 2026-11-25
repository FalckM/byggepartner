// DP2 — Resolves build items against the catalog into a typed context the rules read.
import type { ValidateOptions } from "./report";
import type { BuildItems, Catalog, Category, Component, ComponentOf } from "./types";

export interface BuildContext {
  catalog: Catalog;
  items: BuildItems;
  /** Qty-expanded list of every resolved component. */
  all: Component[];
  cpus: ComponentOf<"CPU">[];
  mbs: ComponentOf<"MOTHERBOARD">[];
  rams: ComponentOf<"RAM">[];
  gpus: ComponentOf<"GPU">[];
  storage: ComponentOf<"STORAGE">[];
  psus: ComponentOf<"PSU">[];
  cases: ComponentOf<"CASE">[];
  coolers: ComponentOf<"COOLER">[];
  oses: ComponentOf<"OS">[];
  accessories: ComponentOf<"ACCESSORY">[];
  cpu?: ComponentOf<"CPU">;
  mb?: ComponentOf<"MOTHERBOARD">;
  pcCase?: ComponentOf<"CASE">;
  psu?: ComponentOf<"PSU">;
  cooler?: ComponentOf<"COOLER">;
  unknownIds: string[];
  options: Required<ValidateOptions>;
}

const indexCache = new WeakMap<Catalog, Map<string, Component>>();

/** id → component, cached per catalog instance (validation must stay < 10 ms on the client). */
export function catalogIndex(catalog: Catalog): Map<string, Component> {
  let idx = indexCache.get(catalog);
  if (!idx) {
    idx = new Map(catalog.map((c) => [c.id, c]));
    indexCache.set(catalog, idx);
  }
  return idx;
}

export function resolveOptions(options: ValidateOptions = {}): Required<ValidateOptions> {
  return {
    includeOs: options.includeOs ?? true,
    wantsWifi: options.wantsWifi ?? false,
    gaming: options.gaming ?? false,
  };
}

export function buildContext(items: BuildItems, catalog: Catalog, options?: ValidateOptions): BuildContext {
  const idx = catalogIndex(catalog);
  const all: Component[] = [];
  const unknownIds: string[] = [];

  for (const item of items) {
    const c = idx.get(item.componentId);
    if (!c || c.category !== item.category) {
      unknownIds.push(item.componentId);
      continue;
    }
    for (let i = 0; i < Math.max(1, item.qty ?? 1); i++) all.push(c);
  }

  const of = <C extends Category>(cat: C) =>
    all.filter((c): c is ComponentOf<C> => c.category === cat);

  const ctx: BuildContext = {
    catalog,
    items,
    all,
    cpus: of("CPU"),
    mbs: of("MOTHERBOARD"),
    rams: of("RAM"),
    gpus: of("GPU"),
    storage: of("STORAGE"),
    psus: of("PSU"),
    cases: of("CASE"),
    coolers: of("COOLER"),
    oses: of("OS"),
    accessories: of("ACCESSORY"),
    unknownIds,
    options: resolveOptions(options),
  };
  ctx.cpu = ctx.cpus[0];
  ctx.mb = ctx.mbs[0];
  ctx.pcCase = ctx.cases[0];
  ctx.psu = ctx.psus[0];
  ctx.cooler = ctx.coolers[0];
  return ctx;
}

/** Price of everything the customer must buy (owned parts in upgrade mode are free). */
export function totalNok(ctx: BuildContext): number {
  const idx = catalogIndex(ctx.catalog);
  return ctx.items.reduce((sum, i) => {
    const c = idx.get(i.componentId);
    return i.owned || !c || c.category !== i.category ? sum : sum + c.priceNok * Math.max(1, i.qty ?? 1);
  }, 0);
}
