// Spec 10.2 / US-22 — CSV import with preview and per-row validation; incomplete rows never reach the engine.
import { expect, test } from "@playwright/test";
import { expectAccessible } from "./helpers";

test("CSV import: preview → commit → incomplete rows are kept out of the shop → cleanup", async ({ page, request }, info) => {
  const name = `e2e-${info.project.name}`;
  const source = `import:${name}`;
  const okId = `ram-e2e-${info.project.name}`;
  const badGpuId = `gpu-e2e-${info.project.name}`;
  const csv = [
    "id;category;brand;name;priceNok;spec.memoryType;spec.modules;spec.capacityGbTotal;spec.speedMts;spec.casLatency;spec.heightMm;spec.chipset;spec.vramGb;spec.lengthMm",
    `${okId};RAM;E2E;E2E 32 GB DDR5;1234;DDR5;2;32;6000;30;34;;;`,
    `${badGpuId};GPU;E2E;E2E Skjermkort uten strømdata;4321;;;;;;;RTX E2E;12;250`,
    "Ugyldig Id;CPU;E2E;Feilrad;99;;;;;;;;;",
  ].join("\n");

  try {
    await page.goto("/admin/import");
    await expectAccessible(page, "import");
    await page.getByLabel("Velg CSV-fil").setInputFiles({ name: `${name}.csv`, mimeType: "text/csv", buffer: Buffer.from(csv, "utf8") });

    const preview = page.getByTestId("import-preview");
    await expect(preview).toBeVisible();
    await expect(page.getByTestId("import-summary")).toContainText("1 komplette");
    await expect(page.getByTestId("import-summary")).toContainText("1 ufullstendige");
    await expect(page.getByTestId("import-summary")).toContainText("1 med feil");
    await expect(preview.locator('[data-status="INCOMPLETE"]')).toContainText("Mangler: slotWidth, tbpW, recommendedPsuW, powerConnectors, perfScore, features");
    await expect(preview.locator('[data-status="ERROR"]')).toContainText("id må være en slug");

    await page.getByTestId("import-commit").click();
    await expect(page.getByTestId("import-message")).toContainText("Importerte 2 rader (1 komplette, 1 ufullstendige)");
    await expect(page.locator(`[data-source="${source}"]`)).toContainText("1 komplette · 1 ufullstendige");

    // The complete row is a normal catalog part …
    const comps = await (await request.get(`/api/components?category=RAM&q=${okId}`)).json();
    expect(comps.compatible.map((c: { id: string }) => c.id)).toEqual([okId]);
    // … the incomplete one is invisible to the shop and rejected by validation.
    const gpus = await (await request.get(`/api/components?category=GPU&q=${badGpuId}`)).json();
    expect(gpus.compatible).toEqual([]);
    const v = await (await request.post("/api/validate", { data: { items: [{ category: "GPU", componentId: badGpuId, qty: 1 }] } })).json();
    expect(v.results.some((r: { ruleId: string }) => r.ruleId === "R00_UNKNOWN_COMPONENT")).toBe(true);

    await page.goto("/admin/katalog");
    await page.getByTestId("incomplete-imports").locator("summary").click();
    await expect(page.getByTestId("incomplete-imports")).toContainText("E2E Skjermkort uten strømdata");
  } finally {
    const del = await request.delete(`/api/admin/import?source=${encodeURIComponent(source)}`);
    expect(del.ok()).toBe(true);
  }
});

test("import API validates input and protects the curated catalog", async ({ request }) => {
  expect((await request.post("/api/admin/import", { data: { mode: "preview", source: "ftp" } })).status()).toBe(400);
  expect((await request.delete("/api/admin/import?source=seed")).status()).toBe(400);
  const res = await request.post("/api/admin/import", {
    data: { mode: "preview", source: "csv", name: "guard", csv: "id,category,brand,name,priceNok\ncpu-amd-ryzen-5-7600,OS,X,Y,1" },
  });
  const body = await res.json();
  expect(body.rows[0].status).toBe("ERROR");
  expect(body.rows[0].errors[0]).toContain("brukes allerede av den kvalitetssikrede katalogen");
});

test("template download is a valid, importable CSV", async ({ request }) => {
  const csv = await (await request.get("/api/admin/import/template")).text();
  const res = await request.post("/api/admin/import", { data: { mode: "preview", source: "csv", name: "template", csv } });
  expect((await res.json()).summary).toMatchObject({ total: 3, ok: 3, error: 0 });
});
