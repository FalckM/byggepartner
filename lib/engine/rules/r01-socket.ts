// DP2, US-04 — R01: CPU must fit the motherboard socket.
import { fail, ok, type Rule } from "./helpers";

export const r01Socket: Rule = {
  id: "R01_SOCKET",
  title: "Prosessoren passer i hovedkortet",
  check: ({ cpu, mb }) => {
    if (!cpu || !mb) return [];
    const ids = [cpu.id, mb.id];
    if (cpu.specs.socket === mb.specs.socket) {
      return [ok("R01_SOCKET", "ERROR", ids, "Prosessoren passer i hovedkortet.", `Sokkel ${cpu.specs.socket} = ${mb.specs.socket}`)];
    }
    return [
      fail(
        "R01_SOCKET",
        "ERROR",
        ids,
        "Prosessoren passer ikke i hovedkortet – de bruker ulik type feste.",
        `CPU-sokkel ${cpu.specs.socket} ≠ hovedkort-sokkel ${mb.specs.socket}`,
        { action: "REPLACE", category: "MOTHERBOARD" },
      ),
    ];
  },
};
