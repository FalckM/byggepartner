// DP2, US-04 — R05: cooler must have a mount for the CPU socket.
import { fail, ok, type Rule } from "./helpers";

export const r05CoolerSocket: Rule = {
  id: "R05_COOLER_SOCKET",
  title: "Kjøleren kan festes på prosessoren",
  check: ({ cooler, cpu }) => {
    if (!cooler || !cpu) return [];
    const ids = [cooler.id, cpu.id];
    const tech = `Kjøler støtter ${cooler.specs.supportedSockets.join("/")}, CPU er ${cpu.specs.socket}`;
    if (!cooler.specs.supportedSockets.includes(cpu.specs.socket)) {
      return [
        fail(
          "R05_COOLER_SOCKET",
          "ERROR",
          ids,
          "Kjøleren kan ikke festes på denne prosessoren.",
          tech,
          { action: "REPLACE", category: "COOLER" },
        ),
      ];
    }
    return [ok("R05_COOLER_SOCKET", "ERROR", ids, "Kjøleren kan festes på prosessoren.", tech)];
  },
};
