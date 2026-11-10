import { describe, expect, it } from "vitest";
import { normalizeAll, normalizeRecord, slugify, summarize } from "@/lib/data/importers/normalize";
import { DATASET_FILES, mapDatasetRow, uniqueIds, usdToNok } from "@/lib/data/importers/pcPartDataset";
import type { Category } from "@/lib/engine/types";

describe("normalizeRecord", () => {
  const okRam = {
    id: "ram-test",
    category: "RAM",
    brand: "Test",
    name: "Test 32 GB",
    priceNok: 999,
    specs: { memoryType: "DDR5", modules: 2, capacityGbTotal: 32, speedMts: 6000, casLatency: 30, heightMm: 34 },
  };

  it("OK when every field is present – defaults fill stock, delivery and summary", () => {
    const r = normalizeRecord(okRam, 1, "import:csv");
    expect(r.status).toBe("OK");
    expect(r.component).toMatchObject({ stock: "ORDER", deliveryDays: 7, incompleteForValidation: false, source: "import:csv" });
  });

  it("INCOMPLETE when spec fields are missing – flagged so the generator never uses it", () => {
    const { heightMm: _drop, ...specs } = okRam.specs;
    void _drop;
    const r = normalizeRecord({ ...okRam, specs }, 1, "import:csv");
    expect(r.status).toBe("INCOMPLETE");
    expect(r.missing).toEqual(["heightMm"]);
    expect(r.component?.incompleteForValidation).toBe(true);
  });

  it("ERROR for bad base fields or wrong types", () => {
    expect(normalizeRecord({ ...okRam, id: "Not A Slug" }, 1, "import:x").status).toBe("ERROR");
    expect(normalizeRecord({ ...okRam, priceNok: -5 }, 1, "import:x").errors[0]).toContain("negativ");
    const wrongType = normalizeRecord({ ...okRam, specs: { ...okRam.specs, memoryType: "DDR9" } }, 1, "import:x");
    expect(wrongType.status).toBe("ERROR");
    expect(wrongType.errors.join()).toContain("memoryType");
  });

  it("rejects duplicate ids within one import", () => {
    const rows = normalizeAll([okRam, okRam], "import:x");
    expect(rows.map((r) => r.status)).toEqual(["OK", "ERROR"]);
    expect(summarize(rows)).toEqual({ total: 2, ok: 1, incomplete: 0, error: 1 });
  });

  it("slugify handles Norwegian letters", () => {
    expect(slugify("Kjøler Æ/Å 360 mm!")).toBe("kjoler-ae-a-360-mm");
  });
});

// Real rows from docyx/pc-part-dataset (inspected 2026-11-10).
const SAMPLE: Record<string, Record<string, unknown>> = {
  CPU: { name: "AMD Ryzen 7 9800X3D", price: 451.5, core_count: 8, core_clock: 4.7, boost_clock: 5.2, microarchitecture: "Zen 5", tdp: 120, graphics: "Radeon" },
  GPU: { name: "MSI GeForce RTX 3060 Ventus 2X 12G", price: 299.97, chipset: "GeForce RTX 3060 12GB", memory: 12, core_clock: 1320, boost_clock: 1777, color: "Black", length: 235 },
  MOTHERBOARD: { name: "Asus PRIME B650-PLUS WIFI", price: 159.99, socket: "AM5", form_factor: "ATX", max_memory: 192, memory_slots: 4, color: "Black / Silver" },
  RAM: { name: "Corsair Vengeance RGB 32 GB", price: 94.99, speed: [5, 6000], modules: [2, 16], price_per_gb: 2.968, color: "Black", first_word_latency: 12, cas_latency: 36 },
  PSU: { name: "MSI MAG A750GL PCIE5", price: 109.99, type: "ATX", efficiency: "gold", wattage: 750, modular: "Full", color: "Black" },
  CASE: { name: "Montech XR", price: 83.59, type: "ATX Mid Tower", color: "Black", psu: null, side_panel: "Tempered Glass", external_volume: 45, internal_35_bays: 2 },
  COOLER: { name: "Thermalright Peerless Assassin 120 SE", price: 34.9, rpm: 1550, noise_level: 25.6, color: "Black / Silver", size: null },
  STORAGE: { name: "Samsung 990 Pro", price: 149.99, capacity: 2000, price_per_gb: 0.075, type: "SSD", cache: 2048, form_factor: "M.2-2280", interface: "M.2 PCIe 4.0 X4" },
  OS: { name: "Microsoft Windows 11 Home OEM - DVD 64-bit", price: 109.99, mode: 64, max_memory: 128 },
};

describe("docyx/pc-part-dataset mapper", () => {
  const rows = normalizeAll(
    (Object.keys(DATASET_FILES) as Category[]).map((c) => mapDatasetRow(c, SAMPLE[c])!),
    "import:pcpartdataset",
  );
  const byCat = Object.fromEntries(rows.map((r) => [r.category, r]));

  it("converts USD to NOK incl. VAT with a fixed demo rate", () => {
    expect(usdToNok(451.5)).toBe(6099);
    expect(usdToNok(0)).toBe(0);
  });

  it("maps what exists (socket, form factor, DDR type, wattage, capacity …)", () => {
    expect(byCat.MOTHERBOARD.component?.specs).toMatchObject({ socket: "AM5", formFactor: "ATX", memorySlots: 4, hasWifi: true });
    expect(byCat.RAM.component?.specs).toMatchObject({ memoryType: "DDR5", modules: 2, capacityGbTotal: 32, speedMts: 6000, rgb: true });
    expect(byCat.PSU.component?.specs).toMatchObject({ wattage: 750, efficiency: "80+ Gold", modular: "FULL", formFactor: "ATX" });
    expect(byCat.STORAGE.component?.specs).toMatchObject({ type: "NVME", interface: "M2_PCIE4", capacityGb: 2000 });
  });

  it("is honest about what is missing: every hardware row is INCOMPLETE", () => {
    for (const c of ["CPU", "GPU", "MOTHERBOARD", "RAM", "PSU", "CASE", "COOLER", "STORAGE"]) {
      expect(byCat[c].status, c).toBe("INCOMPLETE");
    }
    expect(byCat.CPU.missing).toEqual(expect.arrayContaining(["socket", "memorySupport", "perfScoreGaming"]));
    expect(byCat.GPU.missing).toEqual(expect.arrayContaining(["tbpW", "powerConnectors", "perfScore"]));
    expect(byCat.CASE.missing).toEqual(expect.arrayContaining(["maxGpuLengthMm", "maxCoolerHeightMm"]));
    expect(byCat.RAM.missing).toEqual(["heightMm"]);
  });

  it("OS rows have everything and are OK", () => {
    expect(byCat.OS).toMatchObject({ status: "OK", component: { specs: { name: "Microsoft Windows 11 Home OEM", licenseType: "OEM" } } });
  });

  it("tells same-named variants apart (capacity, chipset, speed …)", () => {
    const a = mapDatasetRow("STORAGE", { ...SAMPLE.STORAGE, capacity: 1000 })!;
    const b = mapDatasetRow("STORAGE", { ...SAMPLE.STORAGE, capacity: 2000 })!;
    expect(a.id).not.toBe(b.id);
    expect(b.name).toBe("Samsung 990 Pro (2 TB)");
    const g = mapDatasetRow("GPU", SAMPLE.GPU)!;
    expect(g.name).toContain("GeForce RTX 3060 12GB");
    expect(uniqueIds([a, a, a]).map((r) => r.id)).toEqual([a.id, `${a.id}-2`, `${a.id}-3`]);
  });

  it("skips rows without a price", () => {
    expect(mapDatasetRow("CPU", { ...SAMPLE.CPU, price: null })).toBeNull();
  });
});
