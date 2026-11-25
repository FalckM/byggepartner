// DP2, US-15, RESP-02 — Power estimate (spec 7.3). Pure TS.
import type { BuildContext } from "./context";
import type { PowerReport } from "./report";

export const CPU_BOOST_FACTOR = 1.25;
export const BASE_SYSTEM_W = 50; // motherboard, RAM, fans
export const SSD_W = 8;
export const HDD_W = 10;
export const EXTRA_FAN_W = 5;
export const PSU_HEADROOM = 1.3;

export function estimateLoadW(ctx: Pick<BuildContext, "cpu" | "gpus" | "storage" | "accessories">): number {
  const cpuW = ctx.cpu ? ctx.cpu.specs.tdpW * CPU_BOOST_FACTOR : 0;
  const gpuW = ctx.gpus.reduce((s, g) => s + g.specs.tbpW, 0);
  const driveW = ctx.storage.reduce((s, d) => s + (d.specs.type === "HDD" ? HDD_W : SSD_W), 0);
  const fanW = ctx.accessories.filter((a) => a.specs.kind === "FAN").length * EXTRA_FAN_W;
  return cpuW + gpuW + BASE_SYSTEM_W + driveW + fanW;
}

/** Recommended PSU size: load × 1.3, rounded up to the nearest 50 W. */
export function recommendedPsuW(lastW: number): number {
  return Math.ceil((lastW * PSU_HEADROOM) / 50) * 50;
}

export function powerReport(ctx: Pick<BuildContext, "cpu" | "gpus" | "storage" | "accessories" | "psu">): PowerReport {
  const lastW = Math.round(estimateLoadW(ctx));
  const anbefaltW = recommendedPsuW(lastW);
  if (!ctx.psu) return { lastW, anbefaltW, psuW: null, marginPct: null, status: "NO_PSU" };
  const psuW = ctx.psu.specs.wattage;
  const marginPct = Math.round(((psuW - lastW) / lastW) * 100);
  const status = psuW < lastW ? "TOO_WEAK" : psuW < lastW * PSU_HEADROOM ? "TIGHT" : "GOOD";
  return { lastW, anbefaltW, psuW, marginPct, status };
}
