// DP1, DP3, US-03, US-13, US-18 — Package generator (spec 8). Pure TS, deterministic.
//
// 1. Profile → budget allocation (8.1)
// 2. Candidate pruning: top N by utility/price within ±40 % of the category's share (+ safety picks)
// 3. Beam search CPU → MB → RAM → GPU → CASE → COOLER → PSU → STORAGE, width 50, dropping partial
//    builds that break a compatibility check or cannot be completed within the limit
// 4. Objective: FPS vs. target refresh rate + productivity − warnings/preferences + stock bonus
// 5. Post-fill (paste, Wi-Fi adapter, OS, assembly) and FULL validate() – only ok builds survive
// 6. Three tiers: Spar ≤ 85 %, Anbefalt ≤ 100 %, Ytelse ≤ 110 % of budget
// 7. Otherwise BUDGET_TOO_LOW with the cheapest complete build's price
import { catalogIndex } from "./context";
import { explainComponent } from "./explain";
import { estimateFps, GENERIC_GAME, rawFps, type FpsEstimate } from "./performance";
import { estimateLoadW, powerReport, PSU_HEADROOM } from "./power";
import type { ValidateOptions, ValidationReport } from "./report";
import { GPU_LENGTH_MIN_MARGIN_MM } from "./rules/r03-gpu-length";
import { COOLER_HEADROOM } from "./rules/r06-cooler-capacity";
import { RAM_TALL_MM } from "./rules/r17-ram-height";
import { buildContext } from "./context";
import type { BuildItem, Catalog, Category, Component, ComponentOf, Game, NeedsProfile } from "./types";
import { validate } from "./validate";

// ─── Profiles & allocation (8.1) ──────────────────────────────────────────

export type ProfileKey = "GAMING_1080" | "GAMING_HI" | "ESPORT" | "STUDY" | "EDIT";
export type CoreCategory = "CPU" | "MOTHERBOARD" | "RAM" | "GPU" | "CASE" | "COOLER" | "PSU" | "STORAGE";

export const STEP_ORDER: readonly CoreCategory[] = ["CPU", "MOTHERBOARD", "RAM", "GPU", "CASE", "COOLER", "PSU", "STORAGE"];

export const ALLOCATION: Record<ProfileKey, Record<CoreCategory, number>> = {
  GAMING_1080: { CPU: 0.18, GPU: 0.38, MOTHERBOARD: 0.11, RAM: 0.07, STORAGE: 0.07, PSU: 0.07, CASE: 0.07, COOLER: 0.05 },
  GAMING_HI: { CPU: 0.16, GPU: 0.45, MOTHERBOARD: 0.1, RAM: 0.07, STORAGE: 0.06, PSU: 0.07, CASE: 0.06, COOLER: 0.03 },
  ESPORT: { CPU: 0.24, GPU: 0.32, MOTHERBOARD: 0.11, RAM: 0.08, STORAGE: 0.07, PSU: 0.07, CASE: 0.07, COOLER: 0.04 },
  STUDY: { CPU: 0.3, GPU: 0.05, MOTHERBOARD: 0.15, RAM: 0.12, STORAGE: 0.15, PSU: 0.1, CASE: 0.12, COOLER: 0.06 },
  EDIT: { CPU: 0.26, GPU: 0.3, MOTHERBOARD: 0.11, RAM: 0.11, STORAGE: 0.09, PSU: 0.06, CASE: 0.05, COOLER: 0.02 },
};

export const PROFILE_LABEL: Record<ProfileKey, string> = {
  GAMING_1080: "Spill i 1080p",
  GAMING_HI: "Spill i høy oppløsning",
  ESPORT: "E-sport med høy bildefrekvens",
  STUDY: "Studier og kontor",
  EDIT: "Redigering og streaming",
};

export const TIER_LIMIT = { SAVE: 0.85, RECOMMENDED: 1.0, PERFORMANCE: 1.1 } as const;
export type Tier = keyof typeof TIER_LIMIT;

const BEAM_WIDTH = 50;
const TOP_N = 8;

export function selectProfile(needs: NeedsProfile, games: Game[]): ProfileKey {
  const gaming = needs.uses.includes("GAMING");
  const heavy = needs.uses.some((u) => u === "VIDEO_EDIT" || u === "STREAMING" || u === "3D");
  if (gaming && needs.resolution !== "1080p") return "GAMING_HI";
  if (heavy) return "EDIT";
  if (gaming && needs.targetHz >= 144 && games.length > 0 && games.every((g) => g.esports)) return "ESPORT";
  if (gaming) return "GAMING_1080";
  return "STUDY";
}

// ─── Public result types ──────────────────────────────────────────────────

export interface GeneratedPackage {
  tier: Tier;
  items: BuildItem[];
  totalNok: number;
  /** > 0 only for PERFORMANCE when it exceeds the budget («1 240 kr over budsjettet ditt»). */
  overBudgetNok: number;
  validation: ValidationReport;
  fps: FpsEstimate[];
  /** «Hvorfor denne?» per componentId. */
  explanations: Record<string, string>;
  score: number;
}

export type GenerateResult =
  | { ok: true; profile: ProfileKey; packages: GeneratedPackage[]; durationMs: number }
  | { ok: false; reason: "BUDGET_TOO_LOW"; minimumNok: number; message: string; profile: ProfileKey; durationMs: number };

export interface GenerateOptions {
  /** Upgrade mode: only these categories may be bought; other owned parts are locked (PSU/cooler may still be replaced). */
  upgradeCategories?: Category[];
  beamWidth?: number;
}

// ─── Internal state ───────────────────────────────────────────────────────

type Pick = Component | null; // null = deliberately none (no GPU / stock cooler)
interface State {
  picks: Partial<Record<CoreCategory, Pick>>;
  cost: number;
  h: number;
}

interface Setup {
  needs: NeedsProfile;
  profile: ProfileKey;
  games: Game[];
  gaming: boolean;
  needsGpu: boolean;
  byCat: Record<CoreCategory, Component[]>;
  owned: Map<string, Component>;
  locked: Partial<Record<CoreCategory, Component>>;
  soft: Partial<Record<CoreCategory, Component>>;
  pastePrice: number;
  wifiPrice: number;
  minEff: Record<CoreCategory, number>;
  gpuByPrice: { price: number; best: number }[];
  /** Σ allocation of the categories actually being bought (upgrade mode renormalises). */
  shareSum: number;
  /** Cheapest SSD ≥ 1 TB – what a sensible build should reserve for storage. */
  goodStoragePrice: number;
  /** Pre-computed per component (perf: no work inside sort comparators). */
  util: Map<string, number>;
  eff: Map<string, number>;
  /** Pre-sorted candidate orders per category. */
  ranked: Record<CoreCategory, { byRatio: Component[]; byUtility: Component[]; byPrice: Component[] }>;
  validateOptions: ValidateOptions;
  catalog: Catalog;
  fixedItems: BuildItem[];
  fixedCost: number;
  paste?: Component;
  wifiAdapter?: Component;
}

// ─── Entry point ──────────────────────────────────────────────────────────

export function generate(
  needs: NeedsProfile,
  catalog: Catalog,
  allGames: readonly Game[],
  opts: GenerateOptions = {},
): GenerateResult {
  const t0 = now();
  const s = setup(needs, catalog, allGames, opts);
  const B = needs.budgetNok;

  const pool: Candidate[] = [];
  const seen = new Set<string>();
  for (const tier of ["SAVE", "RECOMMENDED", "PERFORMANCE"] as const) {
    const limit = B * TIER_LIMIT[tier] - s.fixedCost;
    if (limit <= 0) continue;
    for (const st of beamSearch(s, limit, "SCORE", opts.beamWidth ?? BEAM_WIDTH)) addCandidate(s, st, pool, seen);
  }

  const packages = pickTiers(s, pool);
  if (packages.some((p) => p.tier === "RECOMMENDED")) {
    return { ok: true, profile: s.profile, packages, durationMs: now() - t0 };
  }

  // Nothing within budget: find the cheapest complete build (spec 8.2 step 7).
  const cheap: Candidate[] = [];
  for (const st of beamSearch(s, Number.POSITIVE_INFINITY, "COST", opts.beamWidth ?? BEAM_WIDTH)) addCandidate(s, st, cheap, seen);
  cheap.sort((a, b) => a.total - b.total);
  for (const c of cheap) {
    const pkg = finalize(s, c, "RECOMMENDED");
    if (!pkg) continue;
    if (pkg.totalNok <= B) return { ok: true, profile: s.profile, packages: [pkg], durationMs: now() - t0 };
    const minimumNok = Math.ceil(pkg.totalNok / 10) * 10;
    return budgetTooLow(s, minimumNok, t0);
  }
  return budgetTooLow(s, Number.NaN, t0);
}

function budgetTooLow(s: Setup, minimumNok: number, t0: number): GenerateResult {
  const what = s.gaming ? "en komplett spill-PC" : "en komplett PC";
  const nb = new Intl.NumberFormat("nb-NO").format(minimumNok);
  return {
    ok: false,
    reason: "BUDGET_TOO_LOW",
    minimumNok,
    message: Number.isFinite(minimumNok)
      ? `Det laveste vi får til ${what} er ${nb} kr. Vil du justere budsjettet?`
      : `Vi fant ingen komplett PC med disse ønskene. Prøv å endre ønskene eller budsjettet.`,
    profile: s.profile,
    durationMs: now() - t0,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────

function setup(needs: NeedsProfile, catalog: Catalog, allGames: readonly Game[], opts: GenerateOptions): Setup {
  const idx = catalogIndex(catalog);
  const gaming = needs.uses.includes("GAMING");
  const chosenGames = needs.games.map((slug) => allGames.find((g) => g.slug === slug)).filter((g): g is Game => !!g);
  const games = gaming && chosenGames.length === 0 ? [GENERIC_GAME] : chosenGames;
  const profile = selectProfile(needs, chosenGames);

  const usable = catalog.filter((c) => c.stock !== "OUT" && !c.incompleteForValidation);
  const byCat = Object.fromEntries(STEP_ORDER.map((c) => [c, usable.filter((x) => x.category === c)])) as Record<CoreCategory, Component[]>;
  const cheapest = <T extends Component>(list: T[]) => [...list].sort((a, b) => a.priceNok - b.priceNok)[0];
  const accessories = usable.filter((c): c is ComponentOf<"ACCESSORY"> => c.category === "ACCESSORY");
  const paste = cheapest(accessories.filter((a) => a.specs.kind === "THERMAL_PASTE"));
  const wifiAdapter = cheapest(accessories.filter((a) => a.specs.kind === "WIFI_ADAPTER"));

  // Upgrade mode: owned parts.
  const owned = new Map<string, Component>();
  for (const p of needs.existingParts ?? []) {
    const c = p.componentId ? idx.get(p.componentId) : undefined;
    if (c && c.category === p.category) owned.set(c.id, c);
  }
  const upgrade = new Set<Category>(opts.upgradeCategories ?? []);
  const locked: Setup["locked"] = {};
  const soft: Setup["soft"] = {};
  for (const c of owned.values()) {
    if (!(STEP_ORDER as readonly string[]).includes(c.category) || upgrade.has(c.category)) continue;
    const cat = c.category as CoreCategory;
    if (cat === "PSU" || cat === "COOLER") soft[cat] = c; // may be replaced if too weak (S11)
    else locked[cat] = c;
  }

  const ownsOs = [...owned.values()].some((c) => c.category === "OS");
  const fixedItems: BuildItem[] = [];
  if (needs.includeOs && !ownsOs) {
    const os = cheapest(usable.filter((c) => c.category === "OS"));
    if (os) fixedItems.push({ category: "OS", componentId: os.id, qty: 1 });
  }
  if (needs.assemblyService) {
    const a = accessories.find((x) => x.specs.kind === "ASSEMBLY_SERVICE");
    if (a) fixedItems.push({ category: "ACCESSORY", componentId: a.id, qty: 1 });
  }
  for (const c of owned.values()) {
    if (!(STEP_ORDER as readonly string[]).includes(c.category)) fixedItems.push({ category: c.category, componentId: c.id, qty: 1, owned: true });
  }
  const fixedCost = fixedItems.reduce((sum, i) => sum + (i.owned ? 0 : (idx.get(i.componentId)?.priceNok ?? 0)), 0);

  const s: Setup = {
    needs,
    profile,
    games,
    gaming,
    needsGpu: gaming || needs.uses.includes("3D") || needs.uses.includes("VIDEO_EDIT"),
    byCat,
    owned,
    locked,
    soft,
    pastePrice: paste?.priceNok ?? 0,
    wifiPrice: wifiAdapter?.priceNok ?? 0,
    minEff: {} as Record<CoreCategory, number>,
    gpuByPrice: [],
    shareSum: 1,
    goodStoragePrice: 0,
    util: new Map(),
    eff: new Map(),
    ranked: {} as Setup["ranked"],
    validateOptions: { includeOs: needs.includeOs, wantsWifi: !!needs.preferences.wifi, gaming },
    catalog,
    fixedItems,
    fixedCost,
    paste,
    wifiAdapter,
  };
  for (const cat of STEP_ORDER) {
    for (const c of byCat[cat]) {
      s.util.set(c.id, utility(s, c));
      s.eff.set(c.id, effPrice(s, c));
    }
    const u = (c: Component) => s.util.get(c.id)!;
    const e = (c: Component) => s.eff.get(c.id)!;
    const r = (c: Component) => u(c) / Math.max(1, e(c));
    const list = byCat[cat];
    s.ranked[cat] = {
      byRatio: [...list].sort((a, b) => r(b) - r(a) || a.id.localeCompare(b.id)),
      byUtility: [...list].sort((a, b) => u(b) - u(a) || a.priceNok - b.priceNok || a.id.localeCompare(b.id)),
      byPrice: [...list].sort((a, b) => e(a) - e(b) || a.id.localeCompare(b.id)),
    };
    s.minEff[cat] = locked[cat] ? 0 : list.length ? e(s.ranked[cat].byPrice[0]) : Number.POSITIVE_INFINITY;
  }
  s.shareSum = STEP_ORDER.filter((c) => !locked[c]).reduce((sum, c) => sum + ALLOCATION[profile][c], 0) || 1;
  s.goodStoragePrice = Math.min(
    ...byCat.STORAGE.filter((c) => c.category === "STORAGE" && c.specs.type !== "HDD" && c.specs.capacityGb >= 1000).map((c) => c.priceNok),
    Number.POSITIVE_INFINITY,
  );
  // Prefix maximum of GPU performance by price – the beam's optimistic GPU estimate.
  let best = 0;
  s.gpuByPrice = [...byCat.GPU]
    .sort((a, b) => a.priceNok - b.priceNok)
    .map((g) => ({ price: g.priceNok, best: (best = Math.max(best, (g as ComponentOf<"GPU">).specs.perfScore)) }));
  return s;
}

/** Price incl. the extras this part forces into the build (paste, Wi-Fi adapter). Owned = 0. */
function effPrice(s: Setup, c: Component): number {
  if (s.owned.has(c.id)) return 0;
  const cached = s.eff.get(c.id);
  if (cached !== undefined) return cached;
  let p = c.priceNok;
  if (c.category === "COOLER" && !c.specs.includesThermalPaste) p += s.pastePrice;
  if (c.category === "MOTHERBOARD" && s.needs.preferences.wifi && !c.specs.hasWifi) p += s.wifiPrice;
  return p;
}

// ─── Compatibility checks used while searching (mirror the ERROR + avoidable WARNING rules) ──

function get<C extends CoreCategory>(st: State, cat: C): ComponentOf<C> | undefined {
  return (st.picks[cat] ?? undefined) as ComponentOf<C> | undefined;
}

function fits(st: State, c: Component): boolean {
  const cpu = c.category === "CPU" ? c : get(st, "CPU");
  const mb = c.category === "MOTHERBOARD" ? c : get(st, "MOTHERBOARD");
  const ram = c.category === "RAM" ? c : get(st, "RAM");
  const gpu = c.category === "GPU" ? c : get(st, "GPU");
  const pcCase = c.category === "CASE" ? c : get(st, "CASE");
  const cooler = c.category === "COOLER" ? c : get(st, "COOLER");
  const psu = c.category === "PSU" ? c : get(st, "PSU");
  const storage = c.category === "STORAGE" ? c : get(st, "STORAGE");

  if (cpu && mb && (cpu.specs.socket !== mb.specs.socket || !cpu.specs.memorySupport.includes(mb.specs.memoryType))) return false;
  if (ram && mb && (ram.specs.memoryType !== mb.specs.memoryType || ram.specs.modules > mb.specs.memorySlots || ram.specs.capacityGbTotal > mb.specs.maxMemoryGb)) return false;
  if (ram && cpu && !cpu.specs.memorySupport.includes(ram.specs.memoryType)) return false;
  if (gpu && pcCase && gpu.specs.lengthMm > pcCase.specs.maxGpuLengthMm - GPU_LENGTH_MIN_MARGIN_MM) return false;
  if (mb && pcCase && !pcCase.specs.supportedMotherboards.includes(mb.specs.formFactor)) return false;
  if (cooler && cpu) {
    if (!cooler.specs.supportedSockets.includes(cpu.specs.socket)) return false;
    if (cooler.specs.tdpRatingW < cpu.specs.tdpW * COOLER_HEADROOM) return false;
  }
  if (cooler && pcCase) {
    if (cooler.specs.type === "AIR" && (cooler.specs.heightMm ?? 0) > pcCase.specs.maxCoolerHeightMm) return false;
    if (cooler.specs.type === "AIO") {
      const r = cooler.specs.radiatorMm ?? 0;
      if (!pcCase.specs.radiatorSupport.top.includes(r as never) && !pcCase.specs.radiatorSupport.front.includes(r as never)) return false;
    }
  }
  if (cooler && ram && cooler.specs.type === "AIR" && cooler.specs.overhangsRam && ram.specs.heightMm > RAM_TALL_MM) return false;
  if (psu && pcCase && (!pcCase.specs.supportedPsu.includes(psu.specs.formFactor) || psu.specs.lengthMm > pcCase.specs.maxPsuLengthMm)) return false;
  if (psu && gpu) {
    const pc = gpu.specs.powerConnectors;
    if (psu.specs.connectors.pin16_12v2x6 < pc.pin16_12v2x6 || psu.specs.connectors.pcie8pin < pc.pcie8pin) return false;
  }
  if (psu && (cpu || gpu)) {
    const load = estimateLoadW({ cpu, gpus: gpu ? [gpu] : [], storage: storage ? [storage] : [{ specs: { type: "NVME" } } as ComponentOf<"STORAGE">], accessories: [] });
    if (psu.specs.wattage < load * PSU_HEADROOM) return false; // GOOD margin, no R10 warning
  }
  if (storage && mb && storage.specs.type === "NVME" && mb.specs.m2Slots < 1) return false;
  if (storage && storage.specs.type === "HDD") return false; // system drive must be an SSD
  return true;
}

// ─── Utility & scoring ────────────────────────────────────────────────────

const has = (n: NeedsProfile, u: NeedsProfile["uses"][number]) => n.uses.includes(u);

function utility(s: Setup, c: Component): number {
  const n = s.needs;
  const p = n.preferences;
  const colorMatch = (color?: string) => (p.whiteBuild && color === "WHITE" ? 3 : 0);
  switch (c.category) {
    case "CPU": {
      const { perfScoreGaming: g, perfScoreMulti: m, socket } = c.specs;
      const base = s.profile === "EDIT" ? 0.3 * g + 0.7 * m : s.gaming ? 0.7 * g + 0.3 * m : 0.4 * g + 0.6 * m;
      return base + (n.longevityYears === 5 && (socket === "AM5" || socket === "LGA1851") ? 8 : 0);
    }
    case "GPU":
      return c.specs.perfScore + (n.resolution !== "1080p" && c.specs.vramGb >= 12 ? 3 : 0) + colorMatch(c.specs.color);
    case "MOTHERBOARD":
      return 10 + (p.wifi && c.specs.hasWifi ? 3 : 0) + colorMatch(c.specs.color) + c.specs.m2Slots * 0.5 + (p.small && c.specs.formFactor !== "ATX" ? 2 : 0);
    case "RAM": {
      const gb = c.specs.capacityGbTotal;
      return (gb >= 64 ? (s.profile === "EDIT" ? 18 : 12) : gb >= 32 ? 12 : 7) + c.specs.speedMts / 2000 + colorMatch(c.specs.color) + (p.rgb && c.specs.rgb ? 2 : 0);
    }
    case "STORAGE":
      return (c.specs.type === "NVME" ? 10 : 4) + Math.log2(c.specs.capacityGb / 500) * 2;
    case "PSU":
      return 10 + (c.specs.efficiency === "80+ Platinum" ? 2 : c.specs.efficiency === "80+ Gold" ? 1 : 0) + colorMatch(c.specs.color);
    case "CASE":
      return 10 + (p.small && c.specs.formFactorClass !== "MID_TOWER" ? 4 : 0) + colorMatch(c.specs.color) + (p.quiet && !c.specs.hasGlassPanel ? 2 : 0) + c.specs.includedFans * 0.5;
    case "COOLER":
      return 10 + (p.quiet ? (30 - c.specs.noiseDb) / 2 : 0) + colorMatch(c.specs.color) + (p.rgb && c.specs.rgb ? 2 : 0);
    default:
      return 0;
  }
}

/** u(x): full credit up to the target refresh rate, small bonus above (diminishing returns). */
function fpsUtility(fps: number, targetHz: number): number {
  const x = fps / targetHz;
  return Math.min(x, 1) + 0.25 * Math.min(Math.max(x - 1, 0), 1);
}

function scoreOf(s: Setup, st: State, gpuPerfEstimate?: number): number {
  const n = s.needs;
  const cpu = get(st, "CPU");
  const gpu = get(st, "GPU");
  if (!cpu) return 0;
  let score = 0;

  if (s.gaming) {
    const g = gpu ?? (gpuPerfEstimate !== undefined ? ({ specs: { perfScore: gpuPerfEstimate } } as ComponentOf<"GPU">) : undefined);
    const avg = s.games.reduce((sum, game) => sum + fpsUtility(rawFps(game, n.resolution, cpu, g).fps, n.targetHz), 0) / s.games.length;
    score += 100 * avg;
  } else {
    score += 0.5 * cpu.specs.perfScoreMulti + 0.3 * cpu.specs.perfScoreGaming;
  }
  if (s.profile === "EDIT") score += 0.5 * cpu.specs.perfScoreMulti + 0.3 * (gpu?.specs.perfScore ?? gpuPerfEstimate ?? 0);
  else if (has(n, "STUDY") || has(n, "PROGRAMMING")) score += 0.1 * cpu.specs.perfScoreMulti;

  const ram = get(st, "RAM");
  if (ram) {
    const gb = ram.specs.capacityGbTotal;
    score += gb >= 32 ? (s.profile === "EDIT" ? 8 : 4) : gb < 16 ? -10 : 0;
    if (gb >= 64 && s.profile === "EDIT") score += 3;
  }
  const storage = get(st, "STORAGE");
  if (storage) {
    const cap = storage.specs.capacityGb;
    score += cap < 1000 ? -10 : cap >= 4000 ? 4 : cap >= 2000 ? 3 : 0;
  }
  const mb = get(st, "MOTHERBOARD");
  if (mb && !mb.specs.shipsWithBiosSupportFor.includes(cpu.specs.generation)) score -= mb.specs.biosFlashback ? 1 : 4;
  if (n.longevityYears === 5) {
    if (cpu.specs.socket === "AM5" || cpu.specs.socket === "LGA1851") score += 4;
    if (ram && ram.specs.capacityGbTotal >= 32) score += 2;
  }

  // Preferences
  const p = n.preferences;
  const pcCase = get(st, "CASE");
  const cooler = get(st, "COOLER");
  if (p.quiet) score += cooler ? (cooler.specs.noiseDb <= 22 ? 3 : 0) : st.picks.COOLER === null ? -3 : 0;
  if (p.small && pcCase?.specs.formFactorClass === "MID_TOWER") score -= 8;
  if (p.whiteBuild) {
    for (const c of [pcCase, cooler, gpu, ram, mb, get(st, "PSU")]) {
      if (c && "color" in c.specs && c.specs.color !== "WHITE") score -= 2;
    }
  }
  if (p.rgb && [ram, cooler].some((c) => c && "rgb" in c.specs && c.specs.rgb)) score += 3;

  // Secondary quality – keeps the budget useful once FPS is saturated (better CPU for 1 % lows,
  // efficient PSU, better case …). Coolers only count when the customer asked for quiet.
  if (s.gaming) score += 0.1 * cpu.specs.perfScoreGaming + 0.05 * cpu.specs.perfScoreMulti;
  for (const cat of ["MOTHERBOARD", "CASE", "PSU", ...(p.quiet ? ["COOLER" as const] : [])] as const) {
    const c = get(st, cat);
    if (c && !s.owned.has(c.id)) score += 0.5 * (utility(s, c) - 10);
  }

  // Stock: bonus for share of parts in stock (normalised – adding parts must not raise the score).
  const bought = Object.values(st.picks).filter((c): c is Component => !!c && !s.owned.has(c.id));
  if (bought.length) {
    score += (0.5 * bought.filter((c) => c.stock === "IN_STOCK").length) / bought.length;
    score -= bought.filter((c) => c.stock === "LOW").length * 0.5 + bought.filter((c) => c.stock === "ORDER").length * 2;
  }
  return score;
}

// ─── Beam search ──────────────────────────────────────────────────────────

function shareOf(s: Setup, cat: CoreCategory): number {
  return ALLOCATION[s.profile][cat] / s.shareSum;
}

function candidatesFor(s: Setup, st: State, cat: CoreCategory, step: number, limit: number, mode: "SCORE" | "COST"): Pick[] {
  if (s.locked[cat]) return [s.locked[cat]!];
  const cpu = get(st, "CPU");
  const out: Pick[] = [];
  if (cat === "GPU" && !s.needsGpu && cpu?.specs.hasIntegratedGraphics) out.push(null);
  if (cat === "COOLER" && cpu?.specs.includesCooler) out.push(null);
  // Upgrade mode: the customer's own PSU/cooler is always an option (free) if it still fits.
  const softOwned = s.soft[cat];
  if (softOwned && fits(st, softOwned)) out.push(softOwned);

  const { byRatio, byUtility, byPrice } = s.ranked[cat];
  const picks = new Set<Component>();
  if (softOwned) picks.add(softOwned); // avoid listing it twice
  /** Walk a pre-sorted list, collecting up to `n` items that pass `pred` and fit the build. */
  const take = (list: Component[], n: number, pred: (c: Component) => boolean) => {
    let got = 0;
    for (const c of list) {
      if (got >= n) break;
      if (!pred(c) || !fits(st, c)) continue;
      picks.add(c);
      got++;
    }
  };

  if (mode === "COST") {
    take(byPrice, 5, () => true);
    if (softOwned) picks.delete(softOwned);
    return [...out, ...picks];
  }

  const share = shareOf(s, cat) * limit;
  const eff = (c: Component) => s.eff.get(c.id)!;
  // Spec 8.2 step 2: top N by utility/price within ±40 % of the category's budget share …
  take(byRatio, TOP_N, (c) => c.priceNok >= share * 0.6 && c.priceNok <= share * 1.4);
  // … plus safety picks so a feasible build always exists: best utility under the window's top, the two cheapest,
  take(byUtility, 3, (c) => c.priceNok <= share * 1.4);
  take(byPrice, 2, () => true);
  // … and the best parts the remaining budget can actually pay for (high budgets / upgrade mode).
  const slack = limit - st.cost - minRemaining(s, st, step + 1);
  take(byUtility, 3, (c) => eff(c) <= slack);
  if (softOwned) picks.delete(softOwned);
  return [...out, ...picks];
}

function minRemaining(s: Setup, st: State, fromStep: number): number {
  let sum = 0;
  const cpu = get(st, "CPU");
  for (let i = fromStep; i < STEP_ORDER.length; i++) {
    const cat = STEP_ORDER[i];
    if (cat === "GPU" && !s.needsGpu && (!cpu || cpu.specs.hasIntegratedGraphics)) continue;
    if (cat === "COOLER" && (!cpu || cpu.specs.includesCooler)) continue;
    if ((cat === "PSU" || cat === "COOLER") && s.soft[cat]) continue;
    sum += s.minEff[cat];
  }
  return sum;
}

function bestGpuPerfAt(s: Setup, price: number): number {
  let lo = 0;
  let hi = s.gpuByPrice.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (s.gpuByPrice[mid].price <= price) {
      ans = s.gpuByPrice[mid].best;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

function heuristic(s: Setup, st: State, step: number, limit: number, mode: "SCORE" | "COST"): number {
  if (mode === "COST") return -st.cost;
  let gpuEstimate: number | undefined;
  if (st.picks.GPU === undefined && s.needsGpu) {
    const rest = minRemaining(s, st, step + 1) - s.minEff.GPU;
    const remainingShares = STEP_ORDER.slice(step + 1).filter((c) => !s.locked[c]).reduce((sum, c) => sum + shareOf(s, c), 0);
    const gpuBudget = Math.min(limit - st.cost - rest, ((limit - st.cost) * shareOf(s, "GPU")) / remainingShares);
    gpuEstimate = bestGpuPerfAt(s, gpuBudget);
  }
  // Mild pressure to follow the allocation – avoids blowing the budget on early categories.
  const allowed = STEP_ORDER.slice(0, step + 1).filter((c) => !s.locked[c]).reduce((sum, c) => sum + shareOf(s, c), 0) * limit * 1.25;
  const overspend = Math.max(0, st.cost - allowed) / limit;
  // Anticipate storage: a build that can only afford a tiny drive will be penalised later.
  let storagePenalty = 0;
  if (st.picks.STORAGE === undefined && !s.locked.STORAGE) {
    const slack = limit - st.cost - minRemaining(s, st, step + 1);
    if (slack < s.goodStoragePrice - s.minEff.STORAGE) storagePenalty = 6;
  }
  return scoreOf(s, st, gpuEstimate) - 60 * overspend - storagePenalty;
}

function beamSearch(s: Setup, limit: number, mode: "SCORE" | "COST", width: number): State[] {
  // Locked (owned) parts are known from the start so every later step is checked against them.
  let beam: State[] = [{ picks: { ...s.locked }, cost: 0, h: 0 }];
  STEP_ORDER.forEach((cat, step) => {
    const next: State[] = [];
    const keys = new Set<string>();
    for (const st of beam) {
      for (const c of candidatesFor(s, st, cat, step, limit, mode)) {
        const cost = st.cost + (c ? effPrice(s, c) : 0);
        const ns: State = { picks: { ...st.picks, [cat]: c }, cost, h: 0 };
        if (cost + minRemaining(s, ns, step + 1) > limit) continue;
        const key = STEP_ORDER.slice(0, step + 1).map((k) => ns.picks[k]?.id ?? "-").join("|");
        if (keys.has(key)) continue;
        keys.add(key);
        ns.h = heuristic(s, ns, step, limit, mode);
        next.push(ns);
      }
    }
    next.sort((a, b) => b.h - a.h || a.cost - b.cost);
    beam = next.slice(0, width);
  });
  return beam;
}

// ─── Post-fill, validation and tiers ──────────────────────────────────────

interface Candidate {
  state: State;
  items: BuildItem[];
  total: number;
  score: number;
  key: string;
}

function addCandidate(s: Setup, st: State, pool: Candidate[], seen: Set<string>) {
  const items: BuildItem[] = [];
  for (const cat of STEP_ORDER) {
    const c = st.picks[cat];
    if (c) items.push({ category: cat, componentId: c.id, qty: 1, ...(s.owned.has(c.id) ? { owned: true } : {}) });
  }
  // Post-fill (spec 8.2 step 5): paste for a paste-less cooler, Wi-Fi adapter if wanted and missing.
  const cooler = get(st, "COOLER");
  if (cooler && !cooler.specs.includesThermalPaste && s.paste) items.push({ category: "ACCESSORY", componentId: s.paste.id, qty: 1 });
  const mb = get(st, "MOTHERBOARD");
  if (s.needs.preferences.wifi && mb && !mb.specs.hasWifi && s.wifiAdapter)
    items.push({ category: "ACCESSORY", componentId: s.wifiAdapter.id, qty: 1 });
  items.push(...s.fixedItems);

  const key = items.map((i) => i.componentId).sort().join("|");
  if (seen.has(key)) return;
  seen.add(key);
  const idx = catalogIndex(s.catalog);
  const total = items.reduce((sum, i) => sum + (i.owned ? 0 : (idx.get(i.componentId)?.priceNok ?? 0)), 0);
  pool.push({ state: st, items, total, score: scoreOf(s, st), key });
}

function finalize(s: Setup, c: Candidate, tier: Tier): GeneratedPackage | null {
  const validation = validate(c.items, s.catalog, s.validateOptions);
  if (!validation.ok) return null; // invariant: only fully valid packages leave the generator
  const cpu = get(c.state, "CPU");
  const gpu = get(c.state, "GPU");
  const fps =
    cpu && (s.gaming || s.needs.games.length)
      ? s.games.map((g) => estimateFps(g, s.needs.resolution, s.needs.targetHz, cpu, gpu))
      : [];
  const idx = catalogIndex(s.catalog);
  const power = powerReport(buildContext(c.items, s.catalog));
  const gameNames = s.games.filter((g) => g !== GENERIC_GAME).map((g) => g.name);
  const explanations: Record<string, string> = {};
  for (const item of c.items) {
    const comp = idx.get(item.componentId);
    if (comp) explanations[comp.id] = s.owned.has(comp.id) ? "Denne har du fra før – vi har sjekket at den passer med de nye delene." : explainComponent(comp, { needs: s.needs, gameNames, power });
  }
  return {
    tier,
    items: c.items,
    totalNok: validation.totalNok,
    overBudgetNok: Math.max(0, validation.totalNok - s.needs.budgetNok),
    validation,
    fps,
    explanations,
    score: Math.round(c.score * 10) / 10,
  };
}

function firstValid(s: Setup, list: Candidate[], tier: Tier): GeneratedPackage | null {
  for (const c of list) {
    const p = finalize(s, c, tier);
    if (p) return p;
  }
  return null;
}

function pickTiers(s: Setup, pool: Candidate[]): GeneratedPackage[] {
  const B = s.needs.budgetNok;
  const byScore = (a: Candidate, b: Candidate) => b.score - a.score || a.total - b.total || a.key.localeCompare(b.key);
  const within = (f: number) => pool.filter((c) => c.total <= B * f);

  const recommended = firstValid(s, within(1).sort(byScore), "RECOMMENDED");
  if (!recommended) return [];

  // Spar: best score per krone ≤ 85 % (prefer ≥ 60 % of budget so it is still a sensible PC).
  // Pareto frontier first: never pick a build that costs more without scoring higher (no padding).
  const saveList = paretoFrontier(within(TIER_LIMIT.SAVE).filter((c) => c.items !== recommended.items && c.total < recommended.totalNok));
  const sensible = saveList.filter((c) => c.total >= B * 0.6);
  const ratio = (a: Candidate, b: Candidate) => b.score / b.total - a.score / a.total || a.total - b.total || a.key.localeCompare(b.key);
  const save = firstValid(s, (sensible.length ? sensible : saveList).sort(ratio), "SAVE");

  // Ytelse: best score ≤ 110 %, must be noticeably better than Anbefalt (≥ +1) – else omitted.
  const perfList = within(TIER_LIMIT.PERFORMANCE)
    .filter((c) => c.score >= recommended.score + 1 && c.total > recommended.totalNok)
    .sort(byScore);
  const performance = firstValid(s, perfList, "PERFORMANCE");

  return [save, recommended, performance].filter((p): p is GeneratedPackage => p !== null);
}

function paretoFrontier(list: Candidate[]): Candidate[] {
  const sorted = [...list].sort((a, b) => a.total - b.total || b.score - a.score);
  const out: Candidate[] = [];
  let best = Number.NEGATIVE_INFINITY;
  for (const c of sorted) {
    if (c.score > best) {
      out.push(c);
      best = c.score;
    }
  }
  return out;
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
