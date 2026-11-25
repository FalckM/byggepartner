// DP2 — Rule registry. Add a rule by appending it here; validate.ts never changes.
import type { Rule } from "./helpers";
import { r01Socket } from "./r01-socket";
import { r02MemoryType } from "./r02-memory-type";
import { r03GpuLength } from "./r03-gpu-length";
import { r04CoolerHeight } from "./r04-cooler-height";
import { r05CoolerSocket } from "./r05-cooler-socket";
import { r06CoolerCapacity } from "./r06-cooler-capacity";
import { r07RadiatorFit } from "./r07-radiator-fit";
import { r08FormFactor } from "./r08-form-factor";
import { r09PsuForm } from "./r09-psu-form";
import { r10PsuWattage } from "./r10-psu-wattage";
import { r11PsuConnectors } from "./r11-psu-connectors";
import { r12RamSlots } from "./r12-ram-slots";
import { r13M2Slots } from "./r13-m2-slots";
import { r14Sata } from "./r14-sata";
import { r15DisplayOutput } from "./r15-display-output";
import { r16Bios } from "./r16-bios";
import { r17RamHeight } from "./r17-ram-height";
import { r18ThermalPaste } from "./r18-thermal-paste";
import { r19DuplicateSingleton } from "./r19-duplicate-singleton";

export type { Rule } from "./helpers";

export const RULES: readonly Rule[] = [
  r01Socket,
  r02MemoryType,
  r03GpuLength,
  r04CoolerHeight,
  r05CoolerSocket,
  r06CoolerCapacity,
  r07RadiatorFit,
  r08FormFactor,
  r09PsuForm,
  r10PsuWattage,
  r11PsuConnectors,
  r12RamSlots,
  r13M2Slots,
  r14Sata,
  r15DisplayOutput,
  r16Bios,
  r17RamHeight,
  r18ThermalPaste,
  r19DuplicateSingleton,
];
