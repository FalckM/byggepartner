// DP1–DP4, US-04 — Domain types for the compatibility engine.
// PURE TypeScript: must never import from next, prisma or react.
import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────

export const CATEGORIES = [
  "CPU",
  "MOTHERBOARD",
  "RAM",
  "GPU",
  "STORAGE",
  "PSU",
  "CASE",
  "COOLER",
  "OS",
  "ACCESSORY",
] as const;
export const CategorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof CategorySchema>;

export const SocketSchema = z.enum(["AM4", "AM5", "LGA1700", "LGA1851"]);
export type Socket = z.infer<typeof SocketSchema>;

export const MemoryTypeSchema = z.enum(["DDR4", "DDR5"]);
export type MemoryType = z.infer<typeof MemoryTypeSchema>;

/** CPU generation identifiers, used by R16 (BIOS support). */
export const CpuGenerationSchema = z.enum([
  "RYZEN_5000",
  "RYZEN_7000",
  "RYZEN_9000",
  "INTEL_12",
  "INTEL_13",
  "INTEL_14",
  "INTEL_ULTRA_200",
]);
export type CpuGeneration = z.infer<typeof CpuGenerationSchema>;

export const MbFormFactorSchema = z.enum(["ATX", "mATX", "ITX"]);
export type MbFormFactor = z.infer<typeof MbFormFactorSchema>;

export const PsuFormFactorSchema = z.enum(["ATX", "SFX"]);
export type PsuFormFactor = z.infer<typeof PsuFormFactorSchema>;

export const StockSchema = z.enum(["IN_STOCK", "LOW", "ORDER", "OUT"]);
export type Stock = z.infer<typeof StockSchema>;

export const TierLabelSchema = z.enum(["Budsjett", "Mellomklasse", "Entusiast"]);

export const ColorSchema = z.enum(["BLACK", "WHITE"]);

const posInt = z.number().int().positive();
const nonNegInt = z.number().int().nonnegative();
const score = z.number().min(0).max(100);

// ─── Category specs (6.2) ─────────────────────────────────────────────────

export const CpuSpecsSchema = z.object({
  socket: SocketSchema,
  cores: posInt,
  threads: posInt,
  baseGhz: z.number().positive(),
  boostGhz: z.number().positive(),
  tdpW: posInt,
  hasIntegratedGraphics: z.boolean(),
  includesCooler: z.boolean(),
  memorySupport: z.array(MemoryTypeSchema).min(1),
  perfScoreGaming: score,
  perfScoreMulti: score,
  generation: CpuGenerationSchema,
  minBiosByChipset: z.record(z.string(), z.string()).optional(),
});

export const MotherboardSpecsSchema = z.object({
  socket: SocketSchema,
  chipset: z.string().min(1),
  formFactor: MbFormFactorSchema,
  memoryType: MemoryTypeSchema,
  memorySlots: z.union([z.literal(2), z.literal(4)]),
  maxMemoryGb: posInt,
  m2Slots: nonNegInt,
  m2Pcie5Slots: nonNegInt,
  sataPorts: nonNegInt,
  hasWifi: z.boolean(),
  biosFlashback: z.boolean(),
  shipsWithBiosSupportFor: z.array(CpuGenerationSchema).min(1),
  color: ColorSchema.default("BLACK"),
});

export const RamSpecsSchema = z.object({
  memoryType: MemoryTypeSchema,
  modules: posInt,
  capacityGbTotal: posInt,
  speedMts: posInt,
  casLatency: posInt,
  heightMm: z.number().positive(),
  rgb: z.boolean().default(false),
  color: ColorSchema.default("BLACK"),
});

export const GpuFeatureSchema = z.enum(["DLSS", "FSR", "RT", "XESS"]);

export const GpuSpecsSchema = z.object({
  chipset: z.string().min(1),
  vramGb: posInt,
  lengthMm: posInt,
  slotWidth: z.number().positive(),
  tbpW: posInt,
  recommendedPsuW: posInt,
  powerConnectors: z.object({ pcie8pin: nonNegInt, pin16_12v2x6: nonNegInt }),
  perfScore: score,
  features: z.array(GpuFeatureSchema),
  color: ColorSchema.default("BLACK"),
});

export const StorageSpecsSchema = z.object({
  type: z.enum(["NVME", "SATA_SSD", "HDD"]),
  interface: z.enum(["M2_PCIE4", "M2_PCIE5", "SATA"]),
  capacityGb: posInt,
  readMbs: posInt,
});

export const PsuSpecsSchema = z.object({
  wattage: posInt,
  efficiency: z.enum(["80+ Bronze", "80+ Gold", "80+ Platinum"]),
  formFactor: PsuFormFactorSchema,
  modular: z.enum(["NONE", "SEMI", "FULL"]),
  connectors: z.object({
    pcie8pin: nonNegInt,
    pin16_12v2x6: nonNegInt,
    sata: nonNegInt,
    eps8pin: nonNegInt,
  }),
  atx31: z.boolean(),
  lengthMm: posInt,
  color: ColorSchema.default("BLACK"),
});

const RadiatorSize = z.union([z.literal(120), z.literal(240), z.literal(280), z.literal(360)]);

export const CaseSpecsSchema = z.object({
  supportedMotherboards: z.array(MbFormFactorSchema).min(1),
  maxGpuLengthMm: posInt,
  maxCoolerHeightMm: posInt,
  supportedPsu: z.array(PsuFormFactorSchema).min(1),
  maxPsuLengthMm: posInt,
  radiatorSupport: z.object({ top: z.array(RadiatorSize), front: z.array(RadiatorSize) }),
  includedFans: nonNegInt,
  driveBays25: nonNegInt,
  driveBays35: nonNegInt,
  hasGlassPanel: z.boolean(),
  formFactorClass: z.enum(["MID_TOWER", "MINI_TOWER", "SFF"]),
  color: ColorSchema.default("BLACK"),
});

export const CoolerSpecsBaseSchema = z.object({
    type: z.enum(["AIR", "AIO"]),
    supportedSockets: z.array(SocketSchema).min(1),
    heightMm: posInt.optional(),
    radiatorMm: RadiatorSize.optional(),
    tdpRatingW: posInt,
    includesThermalPaste: z.boolean(),
    noiseDb: z.number().positive(),
    overhangsRam: z.boolean().default(false),
    rgb: z.boolean().default(false),
    color: ColorSchema.default("BLACK"),
});
export const CoolerSpecsSchema = CoolerSpecsBaseSchema.refine(
  (c) => (c.type === "AIR" ? c.heightMm !== undefined : c.radiatorMm !== undefined),
  { message: "AIR coolers need heightMm, AIO coolers need radiatorMm" },
);

export const OsSpecsSchema = z.object({
  name: z.string().min(1),
  licenseType: z.enum(["RETAIL", "OEM", "DIGITAL"]),
});

export const AccessoryKindSchema = z.enum([
  "THERMAL_PASTE",
  "WIFI_ADAPTER",
  "CABLE",
  "FAN",
  "ASSEMBLY_SERVICE",
]);

export type AccessoryKind = z.infer<typeof AccessoryKindSchema>;

export const AccessorySpecsSchema = z.object({
  kind: AccessoryKindSchema,
  description: z.string().min(1),
});

// ─── Component (6.1) ──────────────────────────────────────────────────────

const BaseComponentSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id must be a lowercase slug"),
  brand: z.string().min(1),
  name: z.string().min(1),
  priceNok: z.number().int().nonnegative(),
  stock: StockSchema,
  deliveryDays: nonNegInt,
  imageUrl: z.string().optional(),
  plainSummary: z.string().min(10),
  tierLabel: TierLabelSchema.optional(),
  source: z.string().regex(/^(seed|import:.+)$/).default("seed"),
  isDemoData: z.literal(true),
  incompleteForValidation: z.boolean().default(false),
});

export const ComponentSchema = z.discriminatedUnion("category", [
  BaseComponentSchema.extend({ category: z.literal("CPU"), specs: CpuSpecsSchema }),
  BaseComponentSchema.extend({ category: z.literal("MOTHERBOARD"), specs: MotherboardSpecsSchema }),
  BaseComponentSchema.extend({ category: z.literal("RAM"), specs: RamSpecsSchema }),
  BaseComponentSchema.extend({ category: z.literal("GPU"), specs: GpuSpecsSchema }),
  BaseComponentSchema.extend({ category: z.literal("STORAGE"), specs: StorageSpecsSchema }),
  BaseComponentSchema.extend({ category: z.literal("PSU"), specs: PsuSpecsSchema }),
  BaseComponentSchema.extend({ category: z.literal("CASE"), specs: CaseSpecsSchema }),
  BaseComponentSchema.extend({ category: z.literal("COOLER"), specs: CoolerSpecsSchema }),
  BaseComponentSchema.extend({ category: z.literal("OS"), specs: OsSpecsSchema }),
  BaseComponentSchema.extend({ category: z.literal("ACCESSORY"), specs: AccessorySpecsSchema }),
]);
export type Component = z.infer<typeof ComponentSchema>;
export type ComponentInput = z.input<typeof ComponentSchema>;

/** Plain object spec schemas per category (no refinements) – importers use `.partial()` on these. */
export const SPEC_SCHEMAS = {
  CPU: CpuSpecsSchema,
  MOTHERBOARD: MotherboardSpecsSchema,
  RAM: RamSpecsSchema,
  GPU: GpuSpecsSchema,
  STORAGE: StorageSpecsSchema,
  PSU: PsuSpecsSchema,
  CASE: CaseSpecsSchema,
  COOLER: CoolerSpecsBaseSchema,
  OS: OsSpecsSchema,
  ACCESSORY: AccessorySpecsSchema,
} as const;

/** Narrow a Component to a specific category. */
export type ComponentOf<C extends Category> = Extract<Component, { category: C }>;

export type Catalog = readonly Component[];

// ─── Games (6.3) ──────────────────────────────────────────────────────────

export const ResolutionSchema = z.enum(["1080p", "1440p", "2160p"]);
export type Resolution = z.infer<typeof ResolutionSchema>;

export const GameSchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: z.string().min(1),
  iconUrl: z.string().optional(),
  genre: z.string().min(1),
  gpuWeight: z.number().min(0).max(1),
  cpuWeight: z.number().min(0).max(1),
  baseFps: z.object({ "1080p": posInt, "1440p": posInt, "2160p": posInt }),
  /** Engine frame-rate cap (e.g. Elden Ring = 60). */
  fpsCap: posInt.optional(),
  esports: z.boolean(),
});
export type Game = z.infer<typeof GameSchema>;

// ─── NeedsProfile (6.4) ───────────────────────────────────────────────────

export const UseSchema = z.enum(["GAMING", "STUDY", "STREAMING", "VIDEO_EDIT", "PROGRAMMING", "3D"]);
export type Use = z.infer<typeof UseSchema>;

export const ExistingPartSchema = z.object({
  category: CategorySchema,
  componentId: z.string().optional(),
  freeText: z.string().optional(),
});

export const NeedsProfileSchema = z.object({
  budgetNok: z.number().int().min(0).max(50_000),
  includeOs: z.boolean(),
  uses: z.array(UseSchema),
  games: z.array(z.string()),
  resolution: ResolutionSchema,
  targetHz: z.union([z.literal(60), z.literal(144), z.literal(240)]),
  preferences: z.object({
    quiet: z.boolean().optional(),
    small: z.boolean().optional(),
    wifi: z.boolean().optional(),
    rgb: z.boolean().optional(),
    whiteBuild: z.boolean().optional(),
  }),
  longevityYears: z.union([z.literal(3), z.literal(5)]),
  assemblyService: z.boolean(),
  existingParts: z.array(ExistingPartSchema).optional(),
});
export type NeedsProfile = z.infer<typeof NeedsProfileSchema>;

// ─── Build items ──────────────────────────────────────────────────────────

export const BuildItemSchema = z.object({
  category: CategorySchema,
  componentId: z.string().min(1),
  qty: posInt.default(1),
  /** Upgrade mode (US-18): the customer already owns this part – not charged. */
  owned: z.boolean().optional(),
});
export type BuildItem = z.infer<typeof BuildItemSchema>;
export type BuildItems = readonly BuildItem[];

// ─── Scenarios (10.3) ─────────────────────────────────────────────────────

export const ChecklistKeySchema = z.enum([...CATEGORIES, "THERMAL_PASTE", "WIFI"]);

export const ScenarioSchema = z.object({
  id: z.string().regex(/^S\d{2}$/),
  basedOn: z.string(),
  description: z.string(),
  kind: z.enum(["GENERATE", "VALIDATE", "UPGRADE"]),
  needs: NeedsProfileSchema.optional(),
  items: z.array(BuildItemSchema).optional(),
  upgradeCategories: z.array(CategorySchema).optional(),
  expect: z.object({
    packages: z.number().int().optional(),
    ok: z.boolean().optional(),
    recommendedMaxNok: z.number().int().optional(),
    errorRules: z.array(z.string()).optional(),
    warningRules: z.array(z.string()).optional(),
    checklistMissing: z.array(ChecklistKeySchema).optional(),
    checklistPresent: z.array(ChecklistKeySchema).optional(),
    reason: z.literal("BUDGET_TOO_LOW").optional(),
    minFps: z.array(z.object({ game: z.string(), resolution: ResolutionSchema, fps: posInt })).optional(),
    hasFixSuggestion: z.boolean().optional(),
    noJargon: z.boolean().optional(),
    gpuShareMin: z.number().optional(),
  }),
});
export type Scenario = z.infer<typeof ScenarioSchema>;
