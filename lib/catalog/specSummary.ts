// Technical one-line spec summary for admin/expert views (jargon allowed here).
import type { Component } from "@/lib/engine/types";

export function specSummary(c: Component): string {
  switch (c.category) {
    case "CPU": {
      const s = c.specs;
      return [
        s.socket,
        `${s.cores}k/${s.threads}t`,
        `${s.boostGhz} GHz`,
        `${s.tdpW} W`,
        s.memorySupport.join("/"),
        s.hasIntegratedGraphics ? "iGPU" : "ingen iGPU",
        s.includesCooler ? "kjøler medf." : null,
        `spill ${s.perfScoreGaming} · multi ${s.perfScoreMulti}`,
      ]
        .filter(Boolean)
        .join(" · ");
    }
    case "MOTHERBOARD": {
      const s = c.specs;
      return [
        s.socket,
        s.chipset,
        s.formFactor,
        `${s.memoryType} ×${s.memorySlots}`,
        `M.2 ×${s.m2Slots}${s.m2Pcie5Slots ? ` (${s.m2Pcie5Slots} Gen5)` : ""}`,
        `SATA ×${s.sataPorts}`,
        s.hasWifi ? "Wi-Fi" : null,
        s.biosFlashback ? "Flashback" : null,
        `BIOS: ${s.shipsWithBiosSupportFor.join(", ")}`,
      ]
        .filter(Boolean)
        .join(" · ");
    }
    case "RAM": {
      const s = c.specs;
      return `${s.memoryType} · ${s.modules}×${s.capacityGbTotal / s.modules} GB · ${s.speedMts} MT/s CL${s.casLatency} · ${s.heightMm} mm${s.rgb ? " · RGB" : ""}`;
    }
    case "GPU": {
      const s = c.specs;
      const conn = [
        s.powerConnectors.pcie8pin ? `${s.powerConnectors.pcie8pin}×8-pin` : null,
        s.powerConnectors.pin16_12v2x6 ? "12V-2x6" : null,
      ]
        .filter(Boolean)
        .join(" + ");
      return `${s.chipset} · ${s.vramGb} GB · ${s.lengthMm} mm · ${s.tbpW} W (PSU ${s.recommendedPsuW} W) · ${conn} · score ${s.perfScore}`;
    }
    case "STORAGE": {
      const s = c.specs;
      const cap = s.capacityGb >= 1000 ? `${s.capacityGb / 1000} TB` : `${s.capacityGb} GB`;
      return `${s.type} · ${s.interface} · ${cap} · ${s.readMbs} MB/s`;
    }
    case "PSU": {
      const s = c.specs;
      return `${s.wattage} W · ${s.efficiency} · ${s.formFactor} · ${s.modular} · 8-pin ×${s.connectors.pcie8pin}${s.connectors.pin16_12v2x6 ? " · 12V-2x6" : ""}${s.atx31 ? " · ATX 3.1" : ""} · ${s.lengthMm} mm`;
    }
    case "CASE": {
      const s = c.specs;
      return `${s.supportedMotherboards.join("/")} · GPU ≤${s.maxGpuLengthMm} mm · kjøler ≤${s.maxCoolerHeightMm} mm · PSU ${s.supportedPsu.join("/")} · ${s.includedFans} vifter${s.color === "WHITE" ? " · hvit" : ""}`;
    }
    case "COOLER": {
      const s = c.specs;
      const size = s.type === "AIR" ? `${s.heightMm} mm` : `${s.radiatorMm} mm radiator`;
      return `${s.type} · ${size} · ${s.tdpRatingW} W · ${s.noiseDb} dB · ${s.supportedSockets.join("/")}${s.includesThermalPaste ? "" : " · uten pasta"}${s.overhangsRam ? " · overheng RAM" : ""}`;
    }
    case "OS":
      return `${c.specs.name} · ${c.specs.licenseType}`;
    case "ACCESSORY":
      return `${c.specs.kind} · ${c.specs.description}`;
  }
}
