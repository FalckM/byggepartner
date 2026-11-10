// Spec 13 — «Sander-reisen» (RESP-03 persona): 14 000 kr, CS2, 1080p 144 Hz → Anbefalt → swap GPU →
// green check in cart → checkout → confirmation with build guide. Desktop + mobile.
import { expect, test, type Page } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll, expectNoJargon } from "./helpers";

test("Sander finds, adjusts and orders a PC", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await expectAccessible(page, "forside");
  await expectNoHorizontalScroll(page);
  await page.getByRole("link", { name: "Hjelp meg å velge" }).first().click();

  // Wizard (US-01, US-02)
  await expect(page.getByRole("heading", { name: "Hvor mye vil du bruke?" })).toBeFocused();
  await page.getByRole("button", { name: "14 000 kr" }).click();
  await expect(page.getByRole("checkbox", { name: /Inkluder Windows/ })).toBeChecked();
  await expectAccessible(page, "veiviser: budsjett");
  await page.getByRole("button", { name: "Neste" }).click();

  await page.getByRole("checkbox", { name: "Spill" }).check();
  await page.getByRole("checkbox", { name: "Skole/studier" }).check();
  await page.getByRole("button", { name: "Neste" }).click();

  await expect(page.getByText("Steg 3 av 5")).toBeVisible();
  await page.getByRole("checkbox", { name: /Counter-Strike 2/ }).check();
  await expect(page.getByRole("button", { name: "Neste" })).toBeEnabled();
  await expectAccessible(page, "veiviser: spill");
  await page.getByRole("button", { name: "Neste" }).click();

  await expect(page.getByRole("radio", { name: /Vanlig \(1080p\)/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: "144 Hz" })).toBeChecked();
  await page.getByRole("button", { name: "Neste" }).click();
  await page.getByRole("button", { name: "Vis PC-ene mine" }).click();

  // Result (US-03..09, US-13)
  await expect(page).toHaveURL(/\/pakke\/[a-z0-9]{8}$/, { timeout: 20_000 });
  const rec = main(page).locator('[data-testid="tier-card"][data-tier="RECOMMENDED"]');
  await expect(rec).toHaveAttribute("aria-checked", "true");
  await expect(main(page).getByTestId("tier-card")).toHaveCount(3);
  await expect(rec.getByText("Alt passer sammen")).toBeVisible();
  const total = await main(page).getByTestId("sticky-total").innerText();
  expect(Number(total.replace(/\D/g, ""))).toBeLessThanOrEqual(14000);
  const cs2 = main(page).locator('[data-testid="fps-row"][data-game="cs2"]');
  await expect(cs2).toContainText("fps");
  await expectNoJargon(page, "resultat");
  await expectAccessible(page, "resultat");
  await expectNoHorizontalScroll(page);

  // «Hvorfor denne?» (US-08)
  const gpuRow = main(page).locator('[data-testid="part-row"][data-category="GPU"]');
  await gpuRow.getByRole("button", { name: "Hvorfor denne?" }).click();
  await expect(gpuRow.getByText(/skjermkort|bildefrekvens|grafikk/i).last()).toBeVisible();

  // Swap GPU (US-07) – only compatible options; validation stays green.
  const before = await gpuRow.getByTestId("part-name").innerText();
  await gpuRow.getByRole("button", { name: /^Bytt / }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Du kan ikke velge noe som ikke passer");
  const options = dialog.getByTestId("swap-option");
  await expect(options.first()).toBeVisible();
  await options.first().click();
  await expect(dialog).toBeHidden();
  await expect(gpuRow.getByTestId("part-name")).not.toHaveText(before);
  await expect(main(page).getByTestId("fit-status")).toHaveAttribute("data-ok", "true");

  await main(page).getByTestId("add-to-cart").click();

  // Cart (DP4 / H2)
  await expect(page).toHaveURL(/\/handlekurv$/);
  await expect(main(page).getByTestId("green-check")).toBeVisible();
  await expect(main(page).getByTestId("guarantee")).toContainText("bytter vi dem kostnadsfritt");
  await expect(main(page).locator('[data-testid="checklist-item"][data-key="OS"]')).toHaveAttribute("data-status", "OK");
  await expectNoJargon(page, "handlekurv");
  await expectAccessible(page, "handlekurv");
  await expectNoHorizontalScroll(page);
  await main(page).getByTestId("to-checkout").click();

  // Checkout (US-10)
  await expect(page.getByRole("heading", { name: "Kasse" })).toBeVisible();
  await expectAccessible(page, "kasse");
  await page.getByRole("button", { name: "Fullfør (simulert)" }).click();
  await expect(page.getByText("Postnummer har fire siffer")).toBeVisible();
  await page.getByLabel("Fullt navn").fill("Test");
  await page.getByLabel("Adresse").fill("Test");
  await page.getByLabel("Postnummer").fill("4630");
  await page.getByLabel("Poststed").fill("Kristiansand");
  await page.getByRole("button", { name: "Fullfør (simulert)" }).click();

  // Confirmation + build guide (US-20)
  await expect(page).toHaveURL(/\/bekreftelse\//, { timeout: 15_000 });
  await expect(main(page).getByTestId("order-id")).toBeVisible();
  await expect(main(page).getByTestId("certificate")).toContainText("Alt passer sammen.");
  expect(await main(page).getByTestId("build-guide").locator("li").count()).toBeGreaterThan(5);
  await expectAccessible(page, "bekreftelse");
  await expectNoHorizontalScroll(page);
});

/** Next 16 keeps previous routes mounted but hidden – always scope to the visible page. */
function main(page: Page) {
  return page.getByRole("main");
}
