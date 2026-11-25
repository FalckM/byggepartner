// Spec 13 — «RESP-04»: in /bygg choose the 340 mm GPU + a small case → red length message → one-click fix → green.
import { expect, test, type Page } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll } from "./helpers";

test("GPU too long for the case is caught and fixed in one click", async ({ page }) => {
  await page.goto("/bygg");
  await page.getByRole("button", { name: "Start fra et eksempel" }).click();
  const status = main(page).getByTestId("fit-status");
  await expect(status).toHaveAttribute("data-ok", "true");

  const steps = main(page).getByRole("navigation", { name: "Steg" });
  await steps.getByRole("button", { name: /Skjermkort/ }).click();
  await expect(main(page).getByRole("heading", { name: "Velg skjermkort" })).toBeFocused();
  const titan = main(page).getByRole("button", { name: /^Velg( likevel)? Kraftverk GeForce RTX 5070 Ti Titan OC/ });
  const more = main(page).getByRole("button", { name: /^Vis flere/ });
  while (!(await titan.isVisible()) && (await more.isVisible())) await more.click();
  await titan.click();
  await steps.getByRole("button", { name: /Kabinett/ }).click();
  const nofit = main(page).getByTestId("builder-nofit");
  await nofit.locator("summary").click();
  const m1 = nofit.locator('[data-testid="builder-row"][data-id="case-compact-m1-matx"]');
  await expect(m1).toContainText("Passer ikke");
  await m1.getByRole("button", { name: /Velg likevel/ }).click();

  // The problem shows up right away in the step, and the case turns red in the PC drawing.
  await expect(main(page).getByTestId("error-list")).toContainText("Skjermkortet er 5 cm for langt for kabinettet.");
  await expect(main(page).locator('.pc-part[data-category="CASE"][data-state="error"]').last()).toBeAttached();
  await main(page).getByRole("button", { name: "Oppsummering" }).click();
  await expect(status).toHaveAttribute("data-ok", "false");
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
