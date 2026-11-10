// US-04/05/06 — validate(): the ONLY gate for «Alt passer sammen».
import { describe, expect, it } from "vitest";
import { RULES } from "@/lib/engine/rules";
import { validate } from "@/lib/engine/validate";
import { BASE_IDS, baseWith, catalogWith, items, seed, variant } from "./helpers";

const v = (ids: string[], opts?: Parameters<typeof validate>[2]) => validate(items(ids), seed, opts);

describe("validate", () => {
  it("has exactly 19 rules in the registry", () => {
    expect(RULES.map((r) => r.id)).toHaveLength(19);
    expect(new Set(RULES.map((r) => r.id)).size).toBe(19);
  });

  it("accepts the known-good baseline", () => {
    const r = v(BASE_IDS);
    expect(r.ok).toBe(true);
    expect(r.results.filter((x) => !x.passed)).toEqual([]);
    expect(r.checklist.every((i) => i.status === "OK")).toBe(true);
    expect(r.totalNok).toBe(items(BASE_IDS).reduce((s, i) => s + seed.find((c) => c.id === i.componentId)!.priceNok, 0));
    expect(r.rulesChecked).toBeGreaterThan(8);
    expect(r.power.status).toBe("GOOD");
  });

  it("counts qty in the total price", () => {
    const one = v(BASE_IDS).totalNok;
    expect(v([...BASE_IDS.filter((id) => id !== "ssd-nvme-1tb-gen4"), "ssd-nvme-1tb-gen4*2"]).totalNok).toBe(one + 890);
  });

  it("is not ok with a blocking ERROR, even if the checklist is complete", () => {
    const r = v(baseWith({ ram: "ram-ddr4-32-3200" }));
    expect(r.checklist.every((i) => !i.required || i.status === "OK")).toBe(true);
    expect(r.ok).toBe(false);
  });

  it("is ok despite WARNINGs and INFOs", () => {
    const r = v(baseWith({ cpu: "cpu-amd-ryzen-7-9800x3d", mb: "mb-b650-atx-flashback" }, ["cooler-single-tower-155"]));
    expect(r.results.some((x) => !x.passed && x.ruleId === "R16_BIOS")).toBe(true);
    expect(r.ok).toBe(true);
  });

  it("is not ok when something required is missing (incomplete package)", () => {
    expect(v(baseWith({ ram: null })).ok).toBe(false);
    expect(v(baseWith({ os: null })).ok).toBe(false);
    expect(v(baseWith({ cpu: "cpu-intel-core-i5-14600k", mb: "mb-z790-atx-wifi" })).ok).toBe(false); // no cooler
    expect(v(baseWith({}, ["cooler-single-tower-no-paste-150"])).ok).toBe(false); // no paste
    expect(v(baseWith({}, ["cooler-single-tower-no-paste-150", "acc-thermal-paste-basic"])).ok).toBe(true);
  });

  it("an empty build is never ok", () => {
    const r = v([]);
    expect(r.ok).toBe(false);
    expect(r.totalNok).toBe(0);
    expect(r.checklist.filter((i) => i.status === "MISSING").map((i) => i.key)).toEqual(
      expect.arrayContaining(["CPU", "MOTHERBOARD", "RAM", "STORAGE", "PSU", "CASE", "COOLER", "OS"]),
    );
  });

  it("flags unknown component ids as an ERROR (R00)", () => {
    const r = validate([...items(BASE_IDS), { category: "GPU", componentId: "gpu-does-not-exist", qty: 1 }], seed);
    expect(r.ok).toBe(false);
    expect(r.results.find((x) => x.ruleId === "R00_UNKNOWN_COMPONENT")?.involved).toEqual(["gpu-does-not-exist"]);
  });

  it("flags a component listed under the wrong category as unknown", () => {
    const r = validate([{ category: "GPU", componentId: "cpu-amd-ryzen-5-7600", qty: 1 }], seed);
    expect(r.results.some((x) => x.ruleId === "R00_UNKNOWN_COMPONENT")).toBe(true);
  });

  it("fills one-click-fix candidates that actually fix the error (RESP-04)", () => {
    const ids = baseWith({ mb: "mb-b850m-wifi", gpu: "gpu-rtx-5070-ti-titan-oc", psu: "psu-850-gold-atx31", case: "case-compact-m1-matx" });
    const r = v(ids);
    const err = r.results.find((x) => x.ruleId === "R03_GPU_LENGTH" && !x.passed)!;
    expect(err.fixSuggestion?.candidateIds?.length).toBeGreaterThan(0);
    for (const caseId of err.fixSuggestion!.candidateIds!) {
      const fixed = v(ids.map((id) => (id === "case-compact-m1-matx" ? caseId : id)));
      expect(fixed.ok, caseId).toBe(true);
    }
  });

  it("checklist recommends compatible coolers for a CPU without one (RESP-06)", () => {
    const ids = baseWith({ cpu: "cpu-intel-core-i5-14600k", mb: "mb-z790-atx-wifi" });
    const item = v(ids).checklist.find((i) => i.key === "COOLER")!;
    expect(item.status).toBe("MISSING");
    expect(item.recommendedIds?.length).toBeGreaterThan(0);
    for (const id of item.recommendedIds!) expect(v([...ids, id]).ok, id).toBe(true);
  });

  describe("checklist options", () => {
    it("includeOs=false turns OS into a non-blocking reminder", () => {
      const r = v(baseWith({ os: null }), { includeOs: false });
      const os = r.checklist.find((i) => i.key === "OS")!;
      expect(os).toMatchObject({ status: "WARN", required: false });
      expect(os.message).toContain("husk lisensnøkkel");
      expect(r.ok).toBe(true);
    });

    it("wantsWifi requires Wi-Fi on board or an adapter", () => {
      expect(v(BASE_IDS, { wantsWifi: true }).checklist.find((i) => i.key === "WIFI")?.status).toBe("OK");
      const noWifi = baseWith({ mb: "mb-b650-atx-flashback" });
      const r = v(noWifi, { wantsWifi: true });
      const wifi = r.checklist.find((i) => i.key === "WIFI")!;
      expect(wifi.status).toBe("MISSING");
      expect(wifi.recommendedIds?.[0]).toMatch(/^acc-wifi/);
      expect(r.ok).toBe(false);
      expect(v([...noWifi, "acc-wifi-usb-ax"], { wantsWifi: true }).ok).toBe(true);
    });

    it("gaming requires a graphics card even with integrated graphics", () => {
      const noGpu = baseWith({ gpu: null });
      expect(v(noGpu).ok).toBe(true);
      expect(v(noGpu).checklist.find((i) => i.key === "GPU")).toMatchObject({ status: "OK", required: false });
      const r = v(noGpu, { gaming: true });
      expect(r.checklist.find((i) => i.key === "GPU")).toMatchObject({ status: "MISSING", message: "Til spill trenger du et skjermkort." });
      expect(r.ok).toBe(false);
    });

    it("explains why a GPU is needed for a CPU without integrated graphics", () => {
      const r = v(baseWith({ cpu: "cpu-amd-ryzen-5-7500f", gpu: null }, ["cooler-single-tower-155"]));
      expect(r.checklist.find((i) => i.key === "GPU")?.message).toContain("ikke innebygd grafikk");
    });
  });

  it("validates in well under 10 ms (client-side live validation)", () => {
    const ids = items(BASE_IDS);
    for (let i = 0; i < 20; i++) validate(ids, seed); // warm-up
    const times: number[] = [];
    for (let i = 0; i < 50; i++) {
      const t = performance.now();
      validate(ids, seed);
      times.push(performance.now() - t);
    }
    times.sort((a, b) => a - b);
    expect(times[25]).toBeLessThan(10);
  });

  it("works with synthetic catalog extensions", () => {
    const long = variant("gpu-rtx-5060-compact", "long", { lengthMm: 999 });
    const r = validate(items(baseWith({ gpu: long.id }), [long]), catalogWith([long]));
    expect(r.results.some((x) => x.ruleId === "R03_GPU_LENGTH" && !x.passed)).toBe(true);
  });
});
