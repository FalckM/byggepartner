// US-21 — Compatibility map: parts are nodes, rule checks are edges (pure; rendered as SVG in the UI).
import { catalogIndex } from "./context";
import type { RuleId, RuleResult, Severity, ValidationReport } from "./report";
import type { BuildItems, Catalog, Category } from "./types";

export type EdgeStatus = "OK" | "INFO" | "WARNING" | "ERROR";

/** Which pair of categories each rule connects (the "wire" in the map). */
export const RULE_PAIRS: Partial<Record<RuleId, [Category, Category][]>> = {
  R01_SOCKET: [["CPU", "MOTHERBOARD"]],
  R02_MEMORY_TYPE: [["RAM", "MOTHERBOARD"], ["RAM", "CPU"], ["CPU", "MOTHERBOARD"]],
  R03_GPU_LENGTH: [["GPU", "CASE"]],
  R04_COOLER_HEIGHT: [["COOLER", "CASE"]],
  R05_COOLER_SOCKET: [["COOLER", "CPU"]],
  R06_COOLER_CAPACITY: [["COOLER", "CPU"]],
  R07_RADIATOR_FIT: [["COOLER", "CASE"]],
  R08_FORM_FACTOR: [["MOTHERBOARD", "CASE"]],
  R09_PSU_FORM: [["PSU", "CASE"]],
  R10_PSU_WATTAGE: [["PSU", "GPU"], ["PSU", "CPU"]],
  R11_PSU_CONNECTORS: [["PSU", "GPU"]],
  R12_RAM_SLOTS: [["RAM", "MOTHERBOARD"]],
  R13_M2_SLOTS: [["STORAGE", "MOTHERBOARD"]],
  R14_SATA: [["STORAGE", "MOTHERBOARD"], ["STORAGE", "CASE"], ["STORAGE", "PSU"]],
  R15_DISPLAY_OUTPUT: [["CPU", "GPU"]],
  R16_BIOS: [["CPU", "MOTHERBOARD"]],
  R17_RAM_HEIGHT: [["RAM", "COOLER"]],
};

export interface GraphNode {
  id: string;
  category: Category;
  name: string;
}

export interface GraphEdge {
  key: string;
  from: Category;
  to: Category;
  status: EdgeStatus;
  results: RuleResult[];
}

const RANK: Record<EdgeStatus, number> = { OK: 0, INFO: 1, WARNING: 2, ERROR: 3 };
const statusOf = (r: RuleResult): EdgeStatus => (r.passed ? "OK" : (r.severity as Severity));

export function compatGraph(items: BuildItems, catalog: Catalog, report: ValidationReport): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const idx = catalogIndex(catalog);
  const nodes: GraphNode[] = [];
  const seen = new Set<Category>();
  for (const i of items) {
    const c = idx.get(i.componentId);
    if (!c || seen.has(c.category) || c.category === "OS" || c.category === "ACCESSORY") continue;
    seen.add(c.category);
    nodes.push({ id: c.id, category: c.category, name: c.name });
  }

  const edges = new Map<string, GraphEdge>();
  for (const r of report.results) {
    const involvedCats = new Set(r.involved.map((id) => idx.get(id)?.category).filter((c): c is Category => !!c));
    for (const [a, b] of RULE_PAIRS[r.ruleId] ?? []) {
      if (!seen.has(a) || !seen.has(b) || !involvedCats.has(a) || !involvedCats.has(b)) continue;
      const [from, to] = [a, b].sort() as [Category, Category];
      const key = `${from}-${to}`;
      const e = edges.get(key) ?? { key, from, to, status: "OK" as EdgeStatus, results: [] };
      e.results.push(r);
      if (RANK[statusOf(r)] > RANK[e.status]) e.status = statusOf(r);
      edges.set(key, e);
    }
  }
  return { nodes, edges: [...edges.values()].sort((x, y) => RANK[y.status] - RANK[x.status] || x.key.localeCompare(y.key)) };
}
