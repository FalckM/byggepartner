// US-22 — CSV ⇄ component records. Flat, Excel-friendly columns:
//   id, category, brand, name, priceNok, stock, deliveryDays, plainSummary, spec.socket, spec.powerConnectors.pcie8pin, …
// Arrays use «|» (e.g. spec.memorySupport = DDR4|DDR5). Empty cells = missing.
import type { Component } from "../../engine/types";
import { parseCsv, toCsv } from "./csv";

const BASE_COLUMNS = ["id", "category", "brand", "name", "priceNok", "stock", "deliveryDays", "plainSummary", "tierLabel"] as const;
// Fields that are always arrays even with a single value.
const ARRAY_FIELDS = new Set(["memorySupport", "shipsWithBiosSupportFor", "features", "supportedMotherboards", "supportedPsu", "supportedSockets", "top", "front"]);

export function coerce(value: string, key: string): unknown {
  const v = value.trim();
  if (v === "") return undefined;
  if (ARRAY_FIELDS.has(key) || v.includes("|")) return v === "-" ? [] : v.split("|").map((x) => coerce(x, ""));
  if (/^(true|ja|yes)$/i.test(v)) return true;
  if (/^(false|nei|no)$/i.test(v)) return false;
  const num = v.replace(",", ".");
  if (/^-?\d+(\.\d+)?$/.test(num)) return Number(num);
  return v;
}

function setPath(obj: Record<string, unknown>, path: string[], value: unknown) {
  let cur = obj;
  path.slice(0, -1).forEach((k) => {
    cur[k] = (cur[k] as Record<string, unknown>) ?? {};
    cur = cur[k] as Record<string, unknown>;
  });
  cur[path[path.length - 1]] = value;
}

export function csvToRecords(text: string): Record<string, unknown>[] {
  const { headers, rows } = parseCsv(text);
  return rows.map((cells) => {
    const rec: Record<string, unknown> = { specs: {} };
    headers.forEach((h, i) => {
      const cell = cells[i] ?? "";
      if (h.startsWith("spec.")) {
        const path = h.slice(5).split(".");
        const val = coerce(cell, path[path.length - 1]);
        if (val !== undefined) setPath(rec.specs as Record<string, unknown>, path, val);
      } else if (cell.trim() !== "") {
        rec[h] = h === "priceNok" || h === "deliveryDays" ? coerce(cell, h) : cell.trim();
      }
    });
    return rec;
  });
}

function flatten(obj: Record<string, unknown>, prefix: string, out: Record<string, string>) {
  for (const [k, v] of Object.entries(obj)) {
    const key = `${prefix}${k}`;
    if (Array.isArray(v)) out[key] = v.length ? v.join("|") : "-";
    else if (v && typeof v === "object") flatten(v as Record<string, unknown>, `${key}.`, out);
    else if (v !== undefined && v !== null) out[key] = String(v);
  }
}

/** Components → CSV (template download, and round-trip tests). */
export function componentsToCsv(components: Component[], delimiter = ","): string {
  const flat = components.map((c) => {
    const row: Record<string, string> = {};
    for (const col of BASE_COLUMNS) if (c[col] !== undefined) row[col] = String(c[col]);
    flatten(c.specs as Record<string, unknown>, "spec.", row);
    return row;
  });
  const specCols = [...new Set(flat.flatMap((r) => Object.keys(r).filter((k) => k.startsWith("spec."))))].sort();
  const headers = [...BASE_COLUMNS, ...specCols];
  return toCsv(headers, flat.map((r) => headers.map((h) => r[h] ?? "")), delimiter);
}
