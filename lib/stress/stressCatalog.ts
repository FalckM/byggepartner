// Spec 10.4 — 2 000 synthetic but internally consistent components (deterministic, faker.seed(219)).
// Node-only (faker is not shipped to the browser): `pnpm seed:stress` writes public/stress/catalog.json.
import { faker } from "@faker-js/faker";
import { ComponentSchema, type Component, type CpuGeneration, type Socket } from "../engine/types";
import { loadSeedCatalog } from "../data/seedData";

export const STRESS_SEED = 219;
export const STRESS_COUNTS = {
  CPU: 160,
  MOTHERBOARD: 300,
  RAM: 221,
  GPU: 340,
  STORAGE: 200,
  PSU: 220,
  CASE: 300,
  COOLER: 250,
} as const;

const GENS: Record<Socket, CpuGeneration[]> = {
  AM4: ["RYZEN_5000"],
  AM5: ["RYZEN_7000", "RYZEN_9000"],
  LGA1700: ["INTEL_12", "INTEL_13", "INTEL_14"],
  LGA1851: ["INTEL_ULTRA_200"],
};
const SOCKETS = Object.keys(GENS) as Socket[];
const BRANDS = ["Nordvik", "Polar", "Kraftverk", "Fjordtek", "Skarv", "Lynx", "Tind", "Bris"];

const int = (min: number, max: number) => faker.number.int({ min, max });
const pick = <T>(arr: readonly T[]) => faker.helpers.arrayElement(arr);
const chance = (p: number) => faker.number.float({ min: 0, max: 1 }) < p;
const round90 = (n: number) => Math.max(90, Math.round(n / 100) * 100 - 10);
const stock = () => faker.helpers.weightedArrayElement([
  { value: "IN_STOCK" as const, weight: 80 },
  { value: "LOW" as const, weight: 10 },
  { value: "ORDER" as const, weight: 7 },
  { value: "OUT" as const, weight: 3 },
]);

function base(cat: string, i: number, name: string, price: number) {
  const s = stock();
  return {
    id: `stress-${cat.toLowerCase()}-${String(i).padStart(4, "0")}`,
    brand: pick(BRANDS),
    name: `${name} #${i}`,
    priceNok: round90(price),
    stock: s,
    deliveryDays: s === "IN_STOCK" ? int(1, 2) : s === "LOW" ? int(2, 4) : int(5, 21),
    plainSummary: "Syntetisk testkomponent for stresstest av generatoren.",
    source: "import:stress",
    isDemoData: true as const,
  };
}

export function generateStressCatalog(): Component[] {
  faker.seed(STRESS_SEED);
  const raw: unknown[] = [];

  for (let i = 0; i < STRESS_COUNTS.CPU; i++) {
    const socket = pick(SOCKETS);
    const gaming = int(30, 98);
    const multi = Math.min(100, Math.max(20, gaming + int(-25, 25)));
    const tdp = pick([35, 65, 65, 105, 120, 125, 170]);
    raw.push({
      ...base("CPU", i, `Stress CPU ${socket}`, 600 + gaming * 45 + multi * 20),
      category: "CPU",
      specs: {
        socket,
        cores: int(4, 24),
        threads: int(4, 32),
        baseGhz: faker.number.float({ min: 2.5, max: 4.5, fractionDigits: 1 }),
        boostGhz: faker.number.float({ min: 4.5, max: 5.8, fractionDigits: 1 }),
        tdpW: tdp,
        hasIntegratedGraphics: chance(0.6),
        includesCooler: tdp <= 65 && chance(0.5),
        memorySupport: socket === "AM4" ? ["DDR4"] : socket === "LGA1700" ? (chance(0.8) ? ["DDR4", "DDR5"] : ["DDR5"]) : ["DDR5"],
        perfScoreGaming: gaming,
        perfScoreMulti: multi,
        generation: pick(GENS[socket]),
      },
    });
  }

  for (let i = 0; i < STRESS_COUNTS.MOTHERBOARD; i++) {
    const socket = pick(SOCKETS);
    const memoryType = socket === "AM4" ? "DDR4" : socket === "LGA1700" ? pick(["DDR4", "DDR5"] as const) : "DDR5";
    const slots = pick([2, 4] as const);
    const m2 = int(1, 4);
    const gens = GENS[socket];
    const support = faker.helpers.arrayElements(gens, { min: 1, max: gens.length });
    const formFactor = pick(["ATX", "mATX", "ITX"] as const);
    raw.push({
      ...base("MOTHERBOARD", i, `Stress MB ${socket} ${formFactor}`, 900 + int(0, 4000)),
      category: "MOTHERBOARD",
      specs: {
        socket,
        chipset: `S${int(100, 999)}`,
        formFactor,
        memoryType,
        memorySlots: formFactor === "ITX" ? 2 : slots,
        maxMemoryGb: pick([64, 96, 128, 192, 256]),
        m2Slots: m2,
        m2Pcie5Slots: int(0, Math.min(2, m2)),
        sataPorts: formFactor === "ITX" ? 2 : int(2, 6),
        hasWifi: chance(0.5),
        biosFlashback: chance(0.5),
        shipsWithBiosSupportFor: support,
        color: chance(0.1) ? "WHITE" : "BLACK",
      },
    });
  }

  for (let i = 0; i < STRESS_COUNTS.RAM; i++) {
    const memoryType = pick(["DDR4", "DDR5"] as const);
    const modules = pick([2, 2, 2, 4] as const);
    const per = pick([8, 16, 32] as const);
    raw.push({
      ...base("RAM", i, `Stress RAM ${memoryType}`, 250 + modules * per * 18),
      category: "RAM",
      specs: {
        memoryType,
        modules,
        capacityGbTotal: modules * per,
        speedMts: memoryType === "DDR4" ? pick([3200, 3600]) : pick([5600, 6000, 6400]),
        casLatency: int(16, 40),
        heightMm: chance(0.15) ? int(42, 50) : int(31, 38),
        rgb: chance(0.2),
        color: chance(0.15) ? "WHITE" : "BLACK",
      },
    });
  }

  for (let i = 0; i < STRESS_COUNTS.GPU; i++) {
    const perf = int(20, 95);
    const tbp = 90 + perf * 3 + int(-20, 20);
    const new16 = perf > 50 && chance(0.6);
    raw.push({
      ...base("GPU", i, `Stress GPU ${perf}`, 1500 + perf * perf * 1.6),
      category: "GPU",
      specs: {
        chipset: `SX ${perf}00`,
        vramGb: pick([8, 12, 16, 16, 24]),
        lengthMm: int(180, 360),
        slotWidth: pick([2, 2.5, 3, 3.5]),
        tbpW: tbp,
        recommendedPsuW: Math.ceil((tbp * 2 + 150) / 50) * 50,
        powerConnectors: new16 ? { pcie8pin: 0, pin16_12v2x6: 1 } : { pcie8pin: tbp > 220 ? int(2, 3) : 1, pin16_12v2x6: 0 },
        perfScore: perf,
        features: ["RT"],
        color: chance(0.1) ? "WHITE" : "BLACK",
      },
    });
  }

  for (let i = 0; i < STRESS_COUNTS.STORAGE; i++) {
    const type = pick(["NVME", "NVME", "SATA_SSD", "HDD"] as const);
    const cap = pick(type === "HDD" ? [2000, 4000, 8000] : [500, 1000, 2000, 4000]);
    const gen5 = type === "NVME" && chance(0.2);
    raw.push({
      ...base("STORAGE", i, `Stress disk ${type}`, 250 + cap * (type === "HDD" ? 0.25 : 0.7) * (gen5 ? 1.8 : 1)),
      category: "STORAGE",
      specs: {
        type,
        interface: type === "NVME" ? (gen5 ? "M2_PCIE5" : "M2_PCIE4") : "SATA",
        capacityGb: cap,
        readMbs: type === "HDD" ? int(150, 260) : type === "SATA_SSD" ? 550 : gen5 ? int(10000, 14000) : int(3000, 7400),
      },
    });
  }

  for (let i = 0; i < STRESS_COUNTS.PSU; i++) {
    const wattage = pick([450, 550, 650, 750, 850, 1000, 1200]);
    const sfx = chance(0.15);
    const atx31 = chance(0.5);
    raw.push({
      ...base("PSU", i, `Stress PSU ${wattage}W`, 300 + wattage * 1.4 + (atx31 ? 200 : 0)),
      category: "PSU",
      specs: {
        wattage,
        efficiency: pick(["80+ Bronze", "80+ Gold", "80+ Platinum"] as const),
        formFactor: sfx ? "SFX" : "ATX",
        modular: pick(["NONE", "SEMI", "FULL"] as const),
        connectors: { pcie8pin: wattage >= 650 ? int(2, 4) : int(1, 2), pin16_12v2x6: atx31 ? 1 : 0, sata: int(4, 10), eps8pin: wattage >= 750 ? 2 : 1 },
        atx31,
        lengthMm: sfx ? 100 : int(140, 180),
        color: chance(0.1) ? "WHITE" : "BLACK",
      },
    });
  }

  for (let i = 0; i < STRESS_COUNTS.CASE; i++) {
    const cls = pick(["MID_TOWER", "MID_TOWER", "MINI_TOWER", "SFF"] as const);
    const boards = cls === "MID_TOWER" ? ["ATX", "mATX", "ITX"] : cls === "MINI_TOWER" ? ["mATX", "ITX"] : ["ITX"];
    raw.push({
      ...base("CASE", i, `Stress kabinett ${cls}`, 500 + int(0, 1800)),
      category: "CASE",
      specs: {
        supportedMotherboards: boards,
        maxGpuLengthMm: cls === "SFF" ? int(250, 340) : int(280, 420),
        maxCoolerHeightMm: cls === "SFF" ? int(50, 140) : int(145, 185),
        supportedPsu: cls === "SFF" ? (chance(0.5) ? ["SFX"] : ["ATX", "SFX"]) : ["ATX"],
        maxPsuLengthMm: cls === "SFF" ? int(100, 150) : int(150, 220),
        radiatorSupport: { top: cls === "SFF" ? [] : faker.helpers.arrayElements([240, 280, 360] as const), front: faker.helpers.arrayElements([240, 280, 360] as const) },
        includedFans: int(0, 4),
        driveBays25: int(1, 4),
        driveBays35: int(0, 3),
        hasGlassPanel: chance(0.7),
        formFactorClass: cls,
        color: chance(0.2) ? "WHITE" : "BLACK",
      },
    });
  }

  for (let i = 0; i < STRESS_COUNTS.COOLER; i++) {
    const aio = chance(0.3);
    const tdpRating = int(95, 320);
    raw.push({
      ...base("COOLER", i, `Stress kjøler ${aio ? "AIO" : "luft"}`, 200 + tdpRating * (aio ? 4.5 : 2.5)),
      category: "COOLER",
      specs: {
        type: aio ? "AIO" : "AIR",
        supportedSockets: chance(0.9) ? [...SOCKETS] : faker.helpers.arrayElements(SOCKETS, { min: 1, max: 3 }),
        ...(aio ? { radiatorMm: pick([240, 280, 360] as const) } : { heightMm: int(45, 170) }),
        tdpRatingW: tdpRating,
        includesThermalPaste: chance(0.85),
        noiseDb: faker.number.float({ min: 18, max: 34, fractionDigits: 1 }),
        overhangsRam: !aio && chance(0.2),
        rgb: chance(0.25),
        color: chance(0.15) ? "WHITE" : "BLACK",
      },
    });
  }

  const synthetic = raw.map((r) => ComponentSchema.parse(r));
  // OS + accessories come from the curated seed (needed for complete packages).
  const extras = loadSeedCatalog().filter((c) => c.category === "OS" || c.category === "ACCESSORY");
  return [...synthetic, ...extras];
}
