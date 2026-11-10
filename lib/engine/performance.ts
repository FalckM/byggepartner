// DP1, US-09, RESP-01 — Performance score + FPS ESTIMATE (spec 8.3). Pure TS.
// All reference values and baseFps are demo data (DECISIONS.md D11).
import type { ComponentOf, Game, Resolution } from "./types";

/** GPU perfScore that `Game.baseFps` was "measured" against (≈ RTX 5060 Ti / RX 9060 XT class ×1.2). */
export const REF_GPU_SCORE = 50;
/** CPU perfScoreGaming that `Game.baseFps` was "measured" against (≈ Ryzen 7 9700X class). */
export const REF_CPU_SCORE = 70;
/** Integrated graphics treated as a very weak GPU. */
export const IGPU_SCORE = 6;
/** ± spread shown to the customer. */
export const FPS_SPREAD = 0.15;

/** Used when the customer chose «Vet ikke / mye forskjellig» (spec 9.4: general profile). */
export const GENERIC_GAME: Game = {
  id: "generic",
  slug: "generic",
  name: "Typiske spill",
  genre: "Blandet",
  gpuWeight: 0.7,
  cpuWeight: 0.5,
  baseFps: { "1080p": 130, "1440p": 95, "2160p": 52 },
  esports: false,
};

export type FpsLabel = "Spillbart" | "Jevnt" | "Veldig jevnt" | "Konkurransenivå";
export type TargetReach = "YES" | "ALMOST" | "NO";

export interface FpsEstimate {
  game: string;
  gameName: string;
  resolution: Resolution;
  fps: number;
  low: number;
  high: number;
  label: FpsLabel;
  bottleneck: "GPU" | "CPU";
  /** Compared with the customer's monitor refresh rate. */
  reachesTarget: TargetReach;
}

const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

export function fpsLabel(fps: number): FpsLabel {
  if (fps < 45) return "Spillbart";
  if (fps < 90) return "Jevnt";
  if (fps <= 144) return "Veldig jevnt";
  return "Konkurransenivå";
}

export function reachesTarget(fps: number, targetHz: number): TargetReach {
  if (fps >= targetHz) return "YES";
  if (fps >= targetHz * 0.8) return "ALMOST";
  return "NO";
}

/** Raw FPS (no rounding/spread) – used by the generator's objective. */
export function rawFps(
  game: Game,
  resolution: Resolution,
  cpu: ComponentOf<"CPU">,
  gpu: ComponentOf<"GPU"> | undefined,
): { fps: number; bottleneck: "GPU" | "CPU" } {
  const gpuScore = gpu ? gpu.specs.perfScore : cpu.specs.hasIntegratedGraphics ? IGPU_SCORE : 0;
  const gpuFps = game.baseFps[resolution] * (gpuScore / REF_GPU_SCORE);
  // cpuWeight-adjustment: CPU-heavy games react more strongly to a faster/slower CPU.
  const cpuRatio = cpu.specs.perfScoreGaming / REF_CPU_SCORE;
  const cpuFps = game.baseFps["1080p"] * 1.6 * (1 + game.cpuWeight * (cpuRatio - 1));
  let fps = Math.min(gpuFps, cpuFps);
  if (game.fpsCap) fps = Math.min(fps, game.fpsCap);
  return { fps, bottleneck: gpuFps < cpuFps ? "GPU" : "CPU" };
}

export function estimateFps(
  game: Game,
  resolution: Resolution,
  targetHz: number,
  cpu: ComponentOf<"CPU">,
  gpu: ComponentOf<"GPU"> | undefined,
): FpsEstimate {
  const { fps, bottleneck } = rawFps(game, resolution, cpu, gpu);
  const shown = round5(fps);
  return {
    game: game.slug,
    gameName: game.name,
    resolution,
    fps: shown,
    low: round5(fps * (1 - FPS_SPREAD)),
    high: round5(fps * (1 + FPS_SPREAD)),
    label: fpsLabel(fps),
    bottleneck,
    reachesTarget: reachesTarget(fps, targetHz),
  };
}

/** Plain explanation of the bottleneck (US-09 «flaskehals-forklaring»). */
export function bottleneckText(e: FpsEstimate): string {
  return e.bottleneck === "GPU"
    ? `I ${e.gameName} er det skjermkortet som setter grensen. Et kraftigere skjermkort gir flere bilder i sekundet.`
    : `I ${e.gameName} er det prosessoren som setter grensen. Et raskere skjermkort hjelper lite her.`;
}

export function targetText(e: FpsEstimate, targetHz: number): string {
  const word = { YES: "Ja", ALMOST: "Nesten", NO: "Nei" }[e.reachesTarget];
  return `Når ${targetHz} Hz-skjermen din: ${word}`;
}
