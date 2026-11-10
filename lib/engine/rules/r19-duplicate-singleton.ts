// DP2, US-04 — R19: a PC has exactly one CPU, motherboard, case and PSU.
import { CATEGORY_LABEL } from "../labels";
import type { RuleResult } from "../report";
import type { Category } from "../types";
import { fail, ok, type Rule } from "./helpers";

export const SINGLETON_CATEGORIES = ["CPU", "MOTHERBOARD", "CASE", "PSU"] as const satisfies readonly Category[];

export const r19DuplicateSingleton: Rule = {
  id: "R19_DUPLICATE_SINGLETON",
  title: "Ingen doble hoveddeler",
  check: (ctx) => {
    const lists = { CPU: ctx.cpus, MOTHERBOARD: ctx.mbs, CASE: ctx.cases, PSU: ctx.psus };
    const out: RuleResult[] = [];
    for (const cat of SINGLETON_CATEGORIES) {
      const list = lists[cat];
      if (list.length > 1) {
        out.push(
          fail(
            "R19_DUPLICATE_SINGLETON",
            "ERROR",
            [...new Set(list.map((c) => c.id))],
            `Pakken har ${list.length} av «${CATEGORY_LABEL[cat].toLowerCase()}», men en PC bruker bare én.`,
            `${cat} × ${list.length}`,
            { action: "REMOVE", category: cat },
          ),
        );
      }
    }
    if (out.length === 0 && ctx.all.length > 0) {
      out.push(ok("R19_DUPLICATE_SINGLETON", "ERROR", [], "Ingen doble hoveddeler.", "Maks én CPU/MB/CASE/PSU"));
    }
    return out;
  },
};
