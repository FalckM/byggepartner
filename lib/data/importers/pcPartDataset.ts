// US-22, spec 10.2 — Importer for the open dataset docyx/pc-part-dataset (MIT, © 2021-2025 Doc Oliver),
// scraped from PCPartPicker. Verified 2026-11-10: the dataset LACKS most fields our compatibility rules need
// (CPU socket, GPU power/connectors/score, case GPU/cooler clearance, cooler sockets/height, RAM height,
// PSU connectors). Those rows become INCOMPLETE and are never used by the generator.
import type { Category } from "../../engine/types";
import { slugify } from "./normalize";

export const DATASET = {
  name: "pcpartdataset",
  repo: "docyx/pc-part-dataset",
  license: "MIT – © 2021-2025 Doc Oliver",
  url: "https://github.com/docyx/pc-part-dataset",
} as const;

/** Fixed demo exchange rate + 25 % VAT (PCPartPicker prices are USD without VAT). Documented in DECISIONS.md. */
export const USD_TO_NOK = 10.8;
export const VAT = 1.25;
/** USD → NOK incl. VAT, rounded to a «…9» price (never negative). */
export const usdToNok = (usd: number) => Math.max(0, Math.round((usd * USD_TO_NOK * VAT) / 10) * 10 - 1);

export const DATASET_FILES: Record<Exclude<Category, "ACCESSORY">, string> = {
  CPU: "cpu",
  GPU: "video-card",
  MOTHERBOARD: "motherboard",
  RAM: "memory",
  PSU: "power-supply",
  CASE: "case",
  COOLER: "cpu-cooler",
  STORAGE: "internal-hard-drive",
  OS: "os",
};

type Raw = Record<string, unknown>;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const s = (v: unknown) => (typeof v === "string" ? v : "");
const brandOf = (name: string) => name.split(/\s+/)[0] ?? "Ukjent";
const SOCKETS = new Set(["AM4", "AM5", "LGA1700", "LGA1851"]);

/** PCPartPicker reuses one name for many variants – add what tells them apart (capacity, chipset, speed, colour …). */
function variantLabel(category: Category, r: Raw): string {
  const parts: (string | number | undefined)[] = [];
  if (category === "GPU") parts.push(s(r.chipset), r.color ? s(r.color) : undefined);
  if (category === "STORAGE") parts.push(num(r.capacity) ? `${num(r.capacity)! >= 1000 ? `${num(r.capacity)! / 1000} TB` : `${num(r.capacity)} GB`}` : undefined);
  if (category === "RAM") {
    const [gen, mts] = Array.isArray(r.speed) ? (r.speed as number[]) : [];
    const [m, gb] = Array.isArray(r.modules) ? (r.modules as number[]) : [];
    parts.push(gen ? `DDR${gen}-${mts}` : undefined, m ? `${m}×${gb} GB` : undefined, `CL${num(r.cas_latency) ?? "?"}`, s(r.color) || undefined);
  }
  if (category === "PSU") parts.push(num(r.wattage) ? `${num(r.wattage)} W` : undefined, s(r.color) || undefined);
  if (category === "CASE" || category === "COOLER" || category === "MOTHERBOARD") parts.push(s(r.color) || undefined);
  return parts.filter((p) => p !== undefined && p !== "").join(", ");
}

/** Map one dataset row to our raw record shape (normalizeRecord decides OK/INCOMPLETE/ERROR). */
export function mapDatasetRow(category: Category, r: Raw): Raw | null {
  const price = num(r.price);
  const rawName = s(r.name);
  if (!rawName || price === undefined) return null; // no price → cannot be sold
  const variant = variantLabel(category, r);
  const name = variant && !rawName.includes(variant) ? `${rawName} (${variant})` : rawName;
  const base = {
    id: `imp-pcpp-${slugify(`${category}-${rawName}-${variant}`)}`.slice(0, 90).replace(/-+$/, ""),
    category,
    brand: brandOf(rawName),
    name,
    priceNok: usdToNok(price),
    stock: "ORDER",
    deliveryDays: 7,
    plainSummary: "Importert fra åpent datasett (PCPartPicker via docyx) – ikke kvalitetssikret.",
  };
  const specs: Raw = {};
  switch (category) {
    case "CPU":
      Object.assign(specs, {
        cores: num(r.core_count),
        threads: undefined,
        baseGhz: num(r.core_clock),
        boostGhz: num(r.boost_clock),
        tdpW: num(r.tdp),
        hasIntegratedGraphics: r.graphics === undefined ? undefined : r.graphics !== null,
      });
      break;
    case "GPU":
      Object.assign(specs, { chipset: s(r.chipset) || undefined, vramGb: num(r.memory), lengthMm: num(r.length) });
      break;
    case "MOTHERBOARD": {
      const socket = s(r.socket);
      const ff = s(r.form_factor).replace("Micro ATX", "mATX").replace("Mini ITX", "ITX");
      Object.assign(specs, {
        socket: SOCKETS.has(socket) ? socket : undefined,
        formFactor: ["ATX", "mATX", "ITX"].includes(ff) ? ff : undefined,
        maxMemoryGb: num(r.max_memory),
        memorySlots: num(r.memory_slots) === 2 || num(r.memory_slots) === 4 ? num(r.memory_slots) : undefined,
        hasWifi: /wi-?fi/i.test(rawName) || undefined,
      });
      break;
    }
    case "RAM": {
      const [gen, mts] = Array.isArray(r.speed) ? (r.speed as number[]) : [];
      const [modules, per] = Array.isArray(r.modules) ? (r.modules as number[]) : [];
      Object.assign(specs, {
        memoryType: gen === 4 ? "DDR4" : gen === 5 ? "DDR5" : undefined,
        speedMts: mts,
        modules,
        capacityGbTotal: modules && per ? modules * per : undefined,
        casLatency: num(r.cas_latency),
        rgb: /rgb/i.test(rawName),
      });
      break;
    }
    case "PSU": {
      const eff = s(r.efficiency).toLowerCase();
      Object.assign(specs, {
        wattage: num(r.wattage),
        formFactor: r.type === "ATX" || r.type === "SFX" ? r.type : undefined,
        efficiency: eff === "bronze" ? "80+ Bronze" : eff === "gold" ? "80+ Gold" : eff === "platinum" ? "80+ Platinum" : undefined,
        modular: r.modular === "Full" ? "FULL" : r.modular === "Semi" ? "SEMI" : r.modular === false ? "NONE" : undefined,
      });
      break;
    }
    case "CASE": {
      const t = s(r.type);
      Object.assign(specs, {
        supportedMotherboards: /ATX Mid|ATX Full/.test(t) ? ["ATX", "mATX", "ITX"] : /MicroATX/.test(t) ? ["mATX", "ITX"] : /Mini ITX/.test(t) ? ["ITX"] : undefined,
        formFactorClass: /Mid|Full/.test(t) ? "MID_TOWER" : /MicroATX/.test(t) ? "MINI_TOWER" : /Mini ITX/.test(t) ? "SFF" : undefined,
        driveBays35: num(r.internal_35_bays),
        hasGlassPanel: r.side_panel === undefined ? undefined : /glass/i.test(s(r.side_panel)),
      });
      break;
    }
    case "COOLER":
      Object.assign(specs, {
        type: num(r.size) ? "AIO" : undefined,
        radiatorMm: [120, 240, 280, 360].includes(num(r.size) ?? 0) ? num(r.size) : undefined,
        noiseDb: Array.isArray(r.noise_level) ? Math.max(...(r.noise_level as number[])) : num(r.noise_level),
      });
      break;
    case "STORAGE": {
      const iface = s(r.interface);
      Object.assign(specs, {
        type: r.type === "SSD" ? (/M\.2|NVMe|PCIe/i.test(iface) ? "NVME" : "SATA_SSD") : typeof r.type === "number" ? "HDD" : undefined,
        interface: /PCIe 5/.test(iface) ? "M2_PCIE5" : /PCIe 4/.test(iface) ? "M2_PCIE4" : /SATA/.test(iface) ? "SATA" : undefined,
        capacityGb: num(r.capacity),
      });
      break;
    }
    case "OS":
      Object.assign(specs, { name: rawName.replace(/ - .*$/, ""), licenseType: /OEM/i.test(rawName) ? "OEM" : /Retail/i.test(rawName) ? "RETAIL" : "DIGITAL" });
      break;
  }
  return { ...base, specs };
}

/** Download a category file from the dataset (server only – network). Pinned to `ref` for reproducibility. */
export async function fetchDatasetCategory(category: keyof typeof DATASET_FILES, ref = "main"): Promise<Raw[]> {
  const url = `https://raw.githubusercontent.com/${DATASET.repo}/${ref}/data/json/${DATASET_FILES[category]}.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Kunne ikke hente ${url} (${res.status})`);
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) throw new Error(`Uventet format i ${url}`);
  return data as Raw[];
}

/** Last resort for identical rows: make ids unique deterministically (…-2, …-3) in input order. */
export function uniqueIds(records: Raw[]): Raw[] {
  const seen = new Map<string, number>();
  return records.map((r) => {
    const id = String(r.id);
    const n = (seen.get(id) ?? 0) + 1;
    seen.set(id, n);
    return n === 1 ? r : { ...r, id: `${id}-${n}` };
  });
}
