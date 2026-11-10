// DP2, US-04 — R02: RAM type must match the motherboard and be supported by the CPU.
import type { RuleResult } from "../report";
import { fail, ok, type Rule } from "./helpers";

export const r02MemoryType: Rule = {
  id: "R02_MEMORY_TYPE",
  title: "Minnet passer i hovedkortet",
  check: ({ cpu, mb, rams }) => {
    const out: RuleResult[] = [];
    if (cpu && mb && !cpu.specs.memorySupport.includes(mb.specs.memoryType)) {
      out.push(
        fail(
          "R02_MEMORY_TYPE",
          "ERROR",
          [cpu.id, mb.id],
          `Hovedkortet bruker en minnetype (${mb.specs.memoryType}) som prosessoren ikke støtter.`,
          `CPU støtter ${cpu.specs.memorySupport.join("/")}, hovedkort er ${mb.specs.memoryType}`,
          { action: "REPLACE", category: "MOTHERBOARD" },
        ),
      );
    }
    for (const ram of rams) {
      const t = ram.specs.memoryType;
      if (mb && t !== mb.specs.memoryType) {
        out.push(
          fail(
            "R02_MEMORY_TYPE",
            "ERROR",
            [ram.id, mb.id],
            `Minnet (${t}) passer ikke i dette hovedkortet (${mb.specs.memoryType}).`,
            `RAM ${t} ≠ hovedkort ${mb.specs.memoryType}`,
            { action: "REPLACE", category: "RAM" },
          ),
        );
      } else if (cpu && !cpu.specs.memorySupport.includes(t)) {
        out.push(
          fail(
            "R02_MEMORY_TYPE",
            "ERROR",
            [ram.id, cpu.id],
            `Minnet (${t}) virker ikke med denne prosessoren.`,
            `CPU støtter ${cpu.specs.memorySupport.join("/")}, RAM er ${t}`,
            { action: "REPLACE", category: "RAM" },
          ),
        );
      } else if (mb || cpu) {
        out.push(
          ok("R02_MEMORY_TYPE", "ERROR", [ram.id, ...(mb ? [mb.id] : []), ...(cpu ? [cpu.id] : [])], "Minnet passer.", `RAM ${t} OK`),
        );
      }
    }
    return dedupe(out);
  },
};

// Same RAM kit listed with qty>1 yields identical results – keep one.
function dedupe(results: RuleResult[]): RuleResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = `${r.passed}|${r.involved.join(",")}|${r.messageTechnical}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
