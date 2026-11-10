// US-09 — FPS estimate model (spec 8.3).
import { describe, expect, it } from "vitest";
import { loadSeedGames } from "@/lib/data/seedData";
import {
  bottleneckText,
  estimateFps,
  fpsLabel,
  GENERIC_GAME,
  rawFps,
  REF_CPU_SCORE,
  REF_GPU_SCORE,
  reachesTarget,
  targetText,
} from "@/lib/engine/performance";
import type { ComponentOf, Game } from "@/lib/engine/types";
import { comp, variant } from "./helpers";

const games = loadSeedGames();
const game = (slug: string) => games.find((g) => g.slug === slug)!;
const cpu = (id: string) => comp(id) as ComponentOf<"CPU">;
const gpu = (id: string) => comp(id) as ComponentOf<"GPU">;

describe("FPS model", () => {
  it("equals baseFps for the reference GPU when GPU-bound", () => {
    const refGpu = variant("gpu-rtx-5060-compact", "ref", { perfScore: REF_GPU_SCORE }) as ComponentOf<"GPU">;
    const refCpu = variant("cpu-amd-ryzen-7-9700x", "ref", { perfScoreGaming: REF_CPU_SCORE }) as ComponentOf<"CPU">;
    const r = rawFps(game("cyberpunk-2077"), "1440p", refCpu, refGpu);
    expect(r.fps).toBeCloseTo(58);
    expect(r.bottleneck).toBe("GPU");
  });

  it("is CPU-bound in e-sports titles with a strong GPU", () => {
    expect(rawFps(game("cs2"), "1080p", cpu("cpu-intel-core-i3-14100f"), gpu("gpu-rtx-5080-gaming")).bottleneck).toBe("CPU");
  });

  it("scales with GPU and respects engine caps", () => {
    const c = cpu("cpu-amd-ryzen-7-9800x3d");
    expect(rawFps(game("cyberpunk-2077"), "2160p", c, gpu("gpu-rtx-5080-gaming")).fps).toBeGreaterThan(
      rawFps(game("cyberpunk-2077"), "2160p", c, gpu("gpu-rtx-5060-compact")).fps,
    );
    expect(rawFps(game("elden-ring"), "1080p", c, gpu("gpu-rtx-5080-gaming")).fps).toBe(60);
  });

  it("uses integrated graphics as a weak GPU, and 0 without any graphics", () => {
    expect(rawFps(GENERIC_GAME, "1080p", cpu("cpu-amd-ryzen-5-7600"), undefined).fps).toBeGreaterThan(0);
    expect(rawFps(GENERIC_GAME, "1080p", cpu("cpu-amd-ryzen-5-5600"), undefined).fps).toBe(0);
  });

  it("shows an interval of ±15 % rounded to 5 with a plain label", () => {
    const e = estimateFps(game("fortnite"), "1080p", 144, cpu("cpu-amd-ryzen-5-7600"), gpu("gpu-rtx-5060-compact"));
    for (const n of [e.fps, e.low, e.high]) expect(n % 5).toBe(0);
    expect(e.low).toBeLessThan(e.fps);
    expect(e.high).toBeGreaterThan(e.fps);
    expect(e.label).toBe(fpsLabel(e.fps));
  });

  it.each([
    [30, "Spillbart"],
    [45, "Jevnt"],
    [90, "Veldig jevnt"],
    [144, "Veldig jevnt"],
    [145, "Konkurransenivå"],
  ] as const)("%i fps → %s", (fps, label) => expect(fpsLabel(fps)).toBe(label));

  it("compares with the monitor refresh rate", () => {
    expect(reachesTarget(240, 240)).toBe("YES");
    expect(reachesTarget(200, 240)).toBe("ALMOST");
    expect(reachesTarget(150, 240)).toBe("NO");
    const e = estimateFps(game("cs2"), "1080p", 240, cpu("cpu-amd-ryzen-5-7600"), gpu("gpu-rtx-5060-compact"));
    expect(targetText(e, 240)).toMatch(/^Når 240 Hz-skjermen din: (Ja|Nesten|Nei)$/);
  });

  it("explains the bottleneck in plain words", () => {
    const g: Game = game("cs2");
    expect(bottleneckText(estimateFps(g, "1080p", 144, cpu("cpu-intel-core-i3-14100f"), gpu("gpu-rtx-5080-gaming")))).toContain("prosessoren");
    expect(bottleneckText(estimateFps(game("cyberpunk-2077"), "2160p", 60, cpu("cpu-amd-ryzen-7-9800x3d"), gpu("gpu-rtx-4060-compact")))).toContain("skjermkortet");
  });
});
