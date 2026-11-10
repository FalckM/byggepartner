// Spec 13 — «RESP-04»: in /bygg choose the 340 mm GPU + a small case → red length message → one-click fix → green.
import { expect, test, type Page } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll } from "./helpers";

test("GPU too long for the case is caught and fixed in one click", async ({ page }) => {
  await page.goto("/bygg");
  await page.getByRole("button", { name: "Start fra et eksempel" }).click();
  const status = main(page).getByTestId("fit-status");
  await expect(status).toHaveAttribute("data-ok", "true");

  await page.getByRole("tab", { name: /Skjermkort/ }).click();
  await page.getByRole("button", { name: /^Velg( likevel)? Kraftverk GeForce RTX 5070 Ti Titan OC/ }).click();
  await page.getByRole("tab", { name: /Kabinett/ }).click();
  const m1 = main(page).locator('[data-testid="builder-row"][data-id="case-compact-m1-matx"]');
  await expect(m1).toContainText("Passer ikke");
  await m1.getByRole("button", { name: /Velg likevel/ }).click();

  await expect(status).toHaveAttribute("data-ok", "false");
  await expect(main(page).getByTestId("error-list")).toContainText("Skjermkortet er 5 cm for langt for kabinettet.");
  await expectAccessible(page, "bygg med feil");
  await expectNoHorizontalScroll(page);

  await main(page).getByTestId("one-click-fix").first().click();
  await expect(status).toHaveAttribute("data-ok", "true");
  await expect(main(page).getByTestId("green-check")).toBeVisible();
});

/** Next 16 keeps previous routes mounted but hidden – always scope to the visible page. */
function main(page: Page) {
  return page.getByRole("main");
}
