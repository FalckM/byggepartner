// DP2 — the Zod schemas must reject malformed components (seed/import guard).
import { describe, expect, it } from "vitest";
import { ComponentSchema } from "@/lib/engine/types";
import { RAW_COMPONENT_FILES } from "@/lib/data/seedData";

const validCooler = RAW_COMPONENT_FILES["cooler.json"][0] as Record<string, unknown>;
const validCpu = RAW_COMPONENT_FILES["cpu.json"][0] as Record<string, unknown>;

describe("ComponentSchema", () => {
  it("accepts a valid seed row", () => {
    expect(ComponentSchema.safeParse(validCpu).success).toBe(true);
  });

  it("rejects an unknown socket", () => {
    const bad = { ...validCpu, specs: { ...(validCpu.specs as object), socket: "AM3" } };
    expect(ComponentSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an air cooler without height", () => {
    const specs = { ...(validCooler.specs as Record<string, unknown>) };
    delete specs.heightMm;
    expect(ComponentSchema.safeParse({ ...validCooler, specs }).success).toBe(false);
  });

  it("rejects specs that do not match the category", () => {
    expect(ComponentSchema.safeParse({ ...validCpu, category: "GPU" }).success).toBe(false);
  });

  it("rejects non-demo data and non-slug ids", () => {
    expect(ComponentSchema.safeParse({ ...validCpu, isDemoData: false }).success).toBe(false);
    expect(ComponentSchema.safeParse({ ...validCpu, id: "CPU Ryzen" }).success).toBe(false);
  });
});
