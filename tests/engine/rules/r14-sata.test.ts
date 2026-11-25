import { describe, expect, it } from "vitest";
import { run } from "../helpers";
import { r14Sata as rule } from "@/lib/engine/rules/r14-sata";

describe("R14_SATA", () => {
  it("fails more SATA drives than motherboard ports", () => {
    const [r] = run(rule, ["mb-a520m-basic", "ssd-sata-1tb*5"]);
    expect(r).toMatchObject({ passed: false, fixSuggestion: { category: "MOTHERBOARD" } });
  });
  it("fails a hard drive in a case without 3.5\" bays", () => {
    expect(run(rule, ["case-shoebox-s9-itx", "hdd-2tb"])[0]).toMatchObject({ passed: false, fixSuggestion: { category: "CASE" } });
  });
  it("lets 2.5\" SSDs use free 3.5\" bays", () => {
    expect(run(rule, ["mb-z790-atx-wifi", "case-office-matx", "ssd-sata-1tb*4"])[0].passed).toBe(true); // 2 + 2
    expect(run(rule, ["mb-z790-atx-wifi", "case-office-matx", "ssd-sata-1tb*4", "hdd-2tb"])[0].passed).toBe(false);
  });
  it("fails when the PSU lacks SATA power plugs", () => {
    const [r] = run(rule, ["mb-z790-atx-wifi", "case-full-airflow-xl", "psu-basic-450-bronze", "ssd-sata-1tb*3", "hdd-2tb*2"]);
    expect(r).toMatchObject({ passed: false, fixSuggestion: { category: "PSU" } });
  });
  it("passes a normal setup", () => {
    expect(run(rule, ["mb-b650-atx-wifi", "case-midtower-mesh", "psu-650-gold-atx31", "hdd-4tb"])[0].passed).toBe(true);
  });
  it("is not applicable without SATA drives or without any host part", () => {
    expect(run(rule, ["mb-b650-atx-wifi", "ssd-nvme-1tb-gen4"])).toEqual([]);
    expect(run(rule, ["hdd-2tb"])).toEqual([]);
  });
});
