// DP3, US-05, RESP-06 — "Complete package" checklist (spec 7.4).
import type { BuildContext } from "./context";
import { CATEGORY_LABEL, CATEGORY_LABEL_PLAIN } from "./labels";
import type { ChecklistItem, ChecklistKey } from "./report";
import type { AccessoryKind, Category } from "./types";

/** Returns compatible component ids for a category (best first). Injected to avoid a cycle with alternatives.ts. */
export type Recommender = (category: Category, accessoryKind?: AccessoryKind) => string[];

const ALWAYS_REQUIRED = ["CPU", "MOTHERBOARD", "RAM", "STORAGE", "PSU", "CASE"] as const;

const MISSING_TEXT: Partial<Record<Category, string>> = {
  CPU: "Mangler prosessor – PC-en kan ikke starte uten.",
  MOTHERBOARD: "Mangler hovedkort – det er dette alle delene kobles til.",
  RAM: "Mangler minne – PC-en starter ikke uten.",
  STORAGE: "Mangler lagring – du trenger et sted å installere Windows og spill.",
  PSU: "Mangler strømforsyning – den gir strøm til alle delene.",
  CASE: "Mangler kabinett – kassen alt monteres i.",
};

export function buildChecklist(ctx: BuildContext, recommend: Recommender): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const ids = (list: { id: string }[]) => [...new Set(list.map((c) => c.id))];
  const add = (
    key: ChecklistKey,
    category: Category,
    label: string,
    status: ChecklistItem["status"],
    required: boolean,
    message: string,
    satisfiedBy: string[] = [],
    kind?: AccessoryKind,
  ) => {
    const item: ChecklistItem = { key, category, label, status, required, message, satisfiedBy };
    if (status === "MISSING") item.recommendedIds = recommend(category, kind).slice(0, 3);
    items.push(item);
  };

  const lists: Record<(typeof ALWAYS_REQUIRED)[number], { id: string }[]> = {
    CPU: ctx.cpus,
    MOTHERBOARD: ctx.mbs,
    RAM: ctx.rams,
    STORAGE: ctx.storage,
    PSU: ctx.psus,
    CASE: ctx.cases,
  };
  for (const cat of ALWAYS_REQUIRED) {
    const have = lists[cat];
    if (have.length) add(cat, cat, CATEGORY_LABEL_PLAIN[cat], "OK", true, `${CATEGORY_LABEL[cat]} er med.`, ids(have));
    else add(cat, cat, CATEGORY_LABEL_PLAIN[cat], "MISSING", true, MISSING_TEXT[cat]!);
  }

  // Graphics card: required without iGPU, or when the PC is for gaming.
  const { cpu } = ctx;
  const gpuRequired = ctx.options.gaming || (cpu !== undefined && !cpu.specs.hasIntegratedGraphics);
  if (ctx.gpus.length) {
    add("GPU", "GPU", CATEGORY_LABEL_PLAIN.GPU, "OK", gpuRequired, "Skjermkort er med.", ids(ctx.gpus));
  } else if (gpuRequired) {
    add(
      "GPU",
      "GPU",
      CATEGORY_LABEL_PLAIN.GPU,
      "MISSING",
      true,
      cpu && !cpu.specs.hasIntegratedGraphics
        ? "Prosessoren har ikke innebygd grafikk, så du trenger et skjermkort."
        : "Til spill trenger du et skjermkort.",
    );
  } else if (cpu) {
    add("GPU", "GPU", CATEGORY_LABEL_PLAIN.GPU, "OK", false, "Ikke nødvendig – prosessoren har innebygd grafikk.");
  }

  // CPU cooler (RESP-06: forgotten cooler).
  if (ctx.coolers.length) {
    add("COOLER", "COOLER", CATEGORY_LABEL_PLAIN.COOLER, "OK", true, "CPU-kjøler er med.", ids(ctx.coolers));
  } else if (cpu?.specs.includesCooler) {
    add("COOLER", "COOLER", CATEGORY_LABEL_PLAIN.COOLER, "OK", true, "Kjøler følger med prosessoren.", [cpu.id]);
  } else {
    add(
      "COOLER",
      "COOLER",
      CATEGORY_LABEL_PLAIN.COOLER,
      "MISSING",
      true,
      cpu ? "Prosessoren leveres uten kjøler – du trenger en." : "Velg prosessor først, så finner vi riktig kjøler.",
    );
  }

  // Thermal paste (R18) – only relevant for a cooler without pre-applied paste.
  const { cooler } = ctx;
  if (cooler && !cooler.specs.includesThermalPaste) {
    const paste = ctx.accessories.filter((a) => a.specs.kind === "THERMAL_PASTE");
    if (paste.length) add("THERMAL_PASTE", "ACCESSORY", "Kjølepasta", "OK", true, "Kjølepasta er med.", ids(paste));
    else
      add(
        "THERMAL_PASTE",
        "ACCESSORY",
        "Kjølepasta",
        "MISSING",
        true,
        "Kjøleren leveres uten kjølepasta – du trenger en liten tube.",
        [],
        "THERMAL_PASTE",
      );
  }

  // Operating system (RESP-06: forgotten OS).
  if (ctx.oses.length) {
    add("OS", "OS", CATEGORY_LABEL_PLAIN.OS, "OK", ctx.options.includeOs, "Windows er med.", ids(ctx.oses));
  } else if (ctx.options.includeOs) {
    add("OS", "OS", CATEGORY_LABEL_PLAIN.OS, "MISSING", true, "Mangler Windows – uten det kan du ikke bruke PC-en.");
  } else {
    add(
      "OS",
      "OS",
      CATEGORY_LABEL_PLAIN.OS,
      "WARN",
      false,
      "Du har oppgitt at du har Windows – husk lisensnøkkel.",
    );
  }

  // Wi-Fi – only when the customer asked for it.
  if (ctx.options.wantsWifi) {
    const adapters = ctx.accessories.filter((a) => a.specs.kind === "WIFI_ADAPTER");
    if (ctx.mb?.specs.hasWifi) add("WIFI", "MOTHERBOARD", "Trådløst nett (Wi-Fi)", "OK", true, "Hovedkortet har trådløst nett.", [ctx.mb.id]);
    else if (adapters.length) add("WIFI", "ACCESSORY", "Trådløst nett (Wi-Fi)", "OK", true, "Wi-Fi-adapter er med.", ids(adapters));
    else
      add(
        "WIFI",
        "ACCESSORY",
        "Trådløst nett (Wi-Fi)",
        "MISSING",
        true,
        "Hovedkortet har ikke trådløst nett – legg til en Wi-Fi-adapter.",
        [],
        "WIFI_ADAPTER",
      );
  }

  return items;
}

export function checklistComplete(items: ChecklistItem[]): boolean {
  return items.every((i) => !i.required || i.status === "OK");
}
