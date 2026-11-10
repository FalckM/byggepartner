// DP2, US-15, RESP-02 — R10: PSU wattage ≥ load × 1.3 (ERROR < 1.0×, WARNING 1.0–1.3×).
import { fmtW } from "../format";
import { powerReport } from "../power";
import { fail, ok, type Rule } from "./helpers";

export const r10PsuWattage: Rule = {
  id: "R10_PSU_WATTAGE",
  title: "Strømforsyningen har nok kraft",
  check: (ctx) => {
    if (!ctx.psu) return [];
    const p = powerReport(ctx);
    const ids = [ctx.psu.id, ...(ctx.cpu ? [ctx.cpu.id] : []), ...new Set(ctx.gpus.map((g) => g.id))];
    const tech = `Estimert last ${fmtW(p.lastW)}, PSU ${fmtW(p.psuW ?? 0)}, anbefalt ≥ ${fmtW(p.anbefaltW)} (margin ${p.marginPct} %)`;
    if (p.status === "TOO_WEAK") {
      return [
        fail(
          "R10_PSU_WATTAGE",
          "ERROR",
          ids,
          `Strømforsyningen er for svak. PC-en trenger ca. ${fmtW(p.lastW)} – velg minst ${fmtW(p.anbefaltW)}.`,
          tech,
          { action: "REPLACE", category: "PSU" },
        ),
      ];
    }
    if (p.status === "TIGHT") {
      return [
        fail(
          "R10_PSU_WATTAGE",
          "WARNING",
          ids,
          `Strømforsyningen holder, men med liten margin (${p.marginPct} %). Vi anbefaler ${fmtW(p.anbefaltW)}.`,
          tech,
          { action: "REPLACE", category: "PSU" },
        ),
      ];
    }
    return [ok("R10_PSU_WATTAGE", "ERROR", ids, `Strømforsyningen har nok kraft, med ${p.marginPct} % margin.`, tech)];
  },
};
