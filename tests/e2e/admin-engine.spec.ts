// Phase 3 gate in the real UI: /admin/scenarier all green, /admin/stresstest meets its targets.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("/admin/scenarier runs S01–S12 and all pass", async ({ page }) => {
  await page.goto("/admin/scenarier");
  await expect(page.getByTestId("scenario-summary")).toContainText("12 av 12 bestått", { timeout: 30_000 });
  await expect(page.locator('[data-testid="scenario-row"][data-status="PASS"]')).toHaveCount(12);

  await page.getByRole("button", { name: "Vis detaljer for S01" }).click();
  await expect(page.getByText(/^Anbefalt · /)).toBeVisible();
  await page.getByRole("button", { name: "Kjør alle" }).click();
  await expect(page.getByTestId("scenario-summary")).toContainText("12 av 12 bestått");

  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
});

test("/admin/stresstest: 100 % valid and p95 < 300 ms in the browser", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "Runs once (desktop) – heavy");
  test.setTimeout(180_000);
  await page.goto("/admin/stresstest");
  await page.getByRole("button", { name: /Kjør stresstest/ }).click();
  await expect(page.getByText("500 / 500")).toBeVisible({ timeout: 170_000 });
  await expect(page.getByRole("button", { name: /Kjør stresstest/ })).toBeEnabled();
  const kpis = page.getByTestId("stress-kpis");
  await expect(kpis).toContainText("100.0 %");
  await expect(kpis.getByText(/Bestått · mål < 300 ms/)).toBeVisible();
  await expect(kpis.getByText(/Bestått · mål 100 %/)).toBeVisible();
});
