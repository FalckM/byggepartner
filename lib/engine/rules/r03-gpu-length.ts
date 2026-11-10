// DP2, US-04, RESP-04 — R03: graphics card must fit inside the case (WARNING if < 10 mm margin).
import { fmtCm } from "../format";
import { fail, ok, type Rule } from "./helpers";

export const GPU_LENGTH_MIN_MARGIN_MM = 10;

export const r03GpuLength: Rule = {
  id: "R03_GPU_LENGTH",
  title: "Skjermkortet får plass i kabinettet",
  check: ({ gpus, pcCase }) => {
    if (!pcCase) return [];
    const max = pcCase.specs.maxGpuLengthMm;
    return [...new Set(gpus)].map((gpu) => {
      const len = gpu.specs.lengthMm;
      const ids = [gpu.id, pcCase.id];
      const tech = `GPU ${len} mm, kabinett maks ${max} mm (margin ${max - len} mm)`;
      if (len > max) {
        return fail(
          "R03_GPU_LENGTH",
          "ERROR",
          ids,
          `Skjermkortet er ${fmtCm(len - max)} for langt for kabinettet.`,
          tech,
          { action: "REPLACE", category: "CASE" },
        );
      }
      if (max - len < GPU_LENGTH_MIN_MARGIN_MM) {
        return fail(
          "R03_GPU_LENGTH",
          "WARNING",
          ids,
          `Skjermkortet får akkurat plass – bare ${fmtCm(max - len)} til overs. Det kan bli trangt med kabler.`,
          tech,
          { action: "REPLACE", category: "CASE" },
        );
      }
      return ok("R03_GPU_LENGTH", "ERROR", ids, `Skjermkortet får god plass (${fmtCm(max - len)} til overs).`, tech);
    });
  },
};
