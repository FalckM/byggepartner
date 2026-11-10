// Phase 1 gate (US-11/US-22): /admin/katalog lists all seeded components and filtering works.
// Requires: docker compose up -d && pnpm db:seed
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loadSeedCatalog } from "../../lib/data/seedData";

const catalog = loadSeedCatalog();
const count = (pred: (c: (typeof catalog)[number]) => boolean) => catalog.filter(pred).length;

test.describe("/admin/katalog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/katalog");
    await expect(page.getByTestId("result-count")).toBeVisible();
  });

  test("lists every seeded component", async ({ page }) => {
    await expect(page.getByTestId("catalog-row")).toHaveCount(catalog.length);
    await expect(page.getByTestId("result-count")).toHaveText(
      `Viser ${catalog.length} av ${catalog.length} komponenter`,
    );
  });

  test("filters by category, search, stock and max price", async ({ page }) => {
    const rows = page.getByTestId("catalog-row");

    await page.getByRole("button", { name: /^Skjermkort/ }).click();
    await expect(rows).toHaveCount(count((c) => c.category === "GPU"));

    await page.getByLabel("Søk").fill("5070 ti");
    await expect(rows).toHaveCount(count((c) => c.category === "GPU" && /5070 Ti/i.test(c.name)));

    await page.getByLabel("Søk").fill("");
    await page.getByRole("button", { name: /^Alle/ }).click();
    await page.getByLabel("Lagerstatus").selectOption("OUT");
    await expect(rows).toHaveCount(count((c) => c.stock === "OUT"));

    await page.getByLabel("Lagerstatus").selectOption("ALL");
    await page.getByLabel("Maks pris (kr)").fill("500");
    await expect(rows).toHaveCount(count((c) => c.priceNok <= 500));
  });

  test("deep link ?kategori= preselects category", async ({ page }) => {
    await page.goto("/admin/katalog?kategori=CASE");
    await expect(page.getByTestId("catalog-row")).toHaveCount(count((c) => c.category === "CASE"));
  });

  test("shows the prototype banner and has no serious a11y violations", async ({ page }) => {
    await expect(page.getByRole("note", { name: "Om denne nettsiden" })).toContainText(
      "ikke en offisiell Multicom-tjeneste",
    );
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious.map((v) => [v.id, v.nodes.length]))).toEqual([]);
  });
});
