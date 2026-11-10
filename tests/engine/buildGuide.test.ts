// US-20 — personal build guide generated from the parts.
import { describe, expect, it } from "vitest";
import { buildGuide } from "@/lib/engine/buildGuide";
import { findJargon } from "@/lib/engine/explain";
import { BASE_IDS, baseWith, items, seed } from "./helpers";

const guide = (ids: string[]) => buildGuide(items(ids), seed);

describe("buildGuide", () => {
  it("covers the parts in a sensible order without jargon", () => {
    const g = guide(BASE_IDS);
    const titles = g.map((s) => s.title);
    expect(titles[0]).toBe("Gjør klar arbeidsplassen");
    expect(titles.findIndex((t) => t.includes("Ryzen"))).toBeLessThan(titles.findIndex((t) => t.startsWith("Sett inn")));
    expect(titles.at(-1)).toBe("Installer Windows");
    for (const s of g) expect(findJargon(`${s.title} ${s.body}`), s.title).toEqual([]);
  });

  it("warns about pins for AM4 CPUs", () => {
    const g = guide(["cpu-amd-ryzen-5-5600", "mb-b550-atx"]);
    expect(g.find((s) => s.careful && s.body.includes("pinner"))).toBeDefined();
  });

  it("explains the stock cooler, paste and power cables from the actual parts", () => {
    expect(guide(BASE_IDS).some((s) => s.title.includes("kjøleren som fulgte med"))).toBe(true);
    const withPaste = guide(baseWith({}, ["cooler-single-tower-no-paste-150", "acc-thermal-paste-basic"]));
    expect(withPaste.some((s) => s.body.includes("klatt kjølepasta"))).toBe(true);
    const newCable = guide(baseWith({ gpu: "gpu-rtx-5070-compact" }));
    expect(newCable.some((s) => s.body.includes("12V-2x6"))).toBe(true);
  });

  it("adds a BIOS step when needed and an assembly note when chosen", () => {
    const g = guide(baseWith({ cpu: "cpu-amd-ryzen-7-9800x3d", mb: "mb-b650-atx-flashback" }, ["cooler-single-tower-155", "acc-assembly-service"]));
    expect(g[0].title).toBe("Du har valgt montering");
    expect(g.some((s) => s.title.includes("Oppdater programvaren"))).toBe(true);
  });

  it("mentions SATA drives and integrated graphics output", () => {
    const g = guide(baseWith({ gpu: null }, ["hdd-2tb"]));
    expect(g.some((s) => s.title.includes("diskene"))).toBe(true);
    expect(g.at(-2)?.body ?? "").toContain("hovedkortet bak");
  });
});
