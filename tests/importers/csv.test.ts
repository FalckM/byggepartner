import { describe, expect, it } from "vitest";
import { detectDelimiter, parseCsv, toCsv } from "@/lib/data/importers/csv";
import { coerce, componentsToCsv, csvToRecords } from "@/lib/data/importers/csvImport";
import { normalizeAll } from "@/lib/data/importers/normalize";
import { loadSeedCatalog } from "@/lib/data/seedData";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, embedded delimiters and newlines", () => {
    const { headers, rows } = parseCsv('a,b,c\n1,"x, y","he said ""hi""\nnext line"\n\n2,,3\r\n');
    expect(headers).toEqual(["a", "b", "c"]);
    expect(rows).toEqual([
      ["1", "x, y", 'he said "hi"\nnext line'],
      ["2", "", "3"],
    ]);
  });
  it("detects «;» from Norwegian Excel and strips the BOM", () => {
    const text = "﻿id;name;priceNok\nx;Navn, med komma;1499";
    expect(detectDelimiter(text)).toBe(";");
    expect(parseCsv(text)).toEqual({ headers: ["id", "name", "priceNok"], rows: [["x", "Navn, med komma", "1499"]] });
  });
  it("round-trips through toCsv", () => {
    const rows = [["a,b", 'q"q', "line\nbreak"]];
    expect(parseCsv(toCsv(["x", "y", "z"], rows)).rows).toEqual(rows);
  });
});

describe("csv records", () => {
  it("coerces numbers, booleans, arrays and Norwegian decimals", () => {
    expect(coerce("1499", "")).toBe(1499);
    expect(coerce("3,5", "")).toBe(3.5);
    expect(coerce("ja", "")).toBe(true);
    expect(coerce("DDR4|DDR5", "")).toEqual(["DDR4", "DDR5"]);
    expect(coerce("AM5", "supportedSockets")).toEqual(["AM5"]);
    expect(coerce("-", "front")).toEqual([]);
    expect(coerce("", "")).toBeUndefined();
  });
  it("builds nested specs from spec.* columns", () => {
    const [r] = csvToRecords("id,category,spec.powerConnectors.pcie8pin,spec.powerConnectors.pin16_12v2x6\ng,GPU,2,0");
    expect(r).toEqual({ id: "g", category: "GPU", specs: { powerConnectors: { pcie8pin: 2, pin16_12v2x6: 0 } } });
  });
  it("round-trips the whole seed catalog: components → CSV → records → all OK and identical", () => {
    const seed = loadSeedCatalog();
    const rows = normalizeAll(csvToRecords(componentsToCsv(seed, ";")), "import:csv-test");
    expect(rows.filter((r) => r.status !== "OK")).toEqual([]);
    for (const r of rows) {
      const original = seed.find((c) => c.id === r.id)!;
      expect(r.component?.specs, r.id).toEqual(original.specs);
      expect(r.component?.priceNok).toBe(original.priceNok);
    }
  });
});
