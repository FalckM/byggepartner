// Spec 13 — «Det er umulig å komme til grønn hake i handlekurven med en ERROR» (manipulated cart).
import { expect, test, type Page } from "@playwright/test";

const BAD_CART = {
  state: {
    items: [
      { category: "CPU", componentId: "cpu-amd-ryzen-5-7600", qty: 1 },
      { category: "MOTHERBOARD", componentId: "mb-b650-atx-wifi", qty: 1 },
      { category: "RAM", componentId: "ram-ddr4-32-3200", qty: 1 }, // DDR4 on DDR5 board
      { category: "GPU", componentId: "gpu-rtx-5060-compact", qty: 1 },
      { category: "STORAGE", componentId: "ssd-nvme-1tb-gen4", qty: 1 },
      { category: "PSU", componentId: "psu-650-gold-atx31", qty: 1 },
      { category: "CASE", componentId: "case-midtower-mesh", qty: 1 },
      { category: "OS", componentId: "os-windows-11-home", qty: 1 },
    ],
    tier: "CUSTOM",
  },
  version: 1,
};

test("a manipulated cart never shows the green check and cannot be ordered", async ({ page, request }) => {
  await page.addInitScript((cart) => window.localStorage.setItem("bp-cart", JSON.stringify(cart)), BAD_CART);
  await page.goto("/handlekurv");
  const status = main(page).getByTestId("fit-status");
  await expect(status).toHaveAttribute("data-ok", "false");
  await expect(main(page).getByTestId("green-check")).toHaveCount(0);
  await expect(main(page).getByTestId("to-checkout-disabled")).toBeDisabled();
  await expect(main(page).getByTestId("error-list")).toContainText("Minnet (DDR4) passer ikke");

  // Direct navigation to checkout is refused too …
  await page.goto("/kasse");
  await expect(page.getByRole("heading", { name: "Ikke helt klar for kassen" })).toBeVisible();

  // … and so is the API (server re-validates).
  const res = await request.post("/api/orders", { data: { items: BAD_CART.state.items, tier: "CUSTOM" } });
  expect(res.status()).toBe(422);

  // Unknown component ids are blocked as well.
  const fake = await request.post("/api/validate", { data: { items: [{ category: "GPU", componentId: "gpu-fake", qty: 1 }] } });
  expect((await fake.json()).ok).toBe(false);

  // Fixing it in one click turns the check green.
  await page.goto("/handlekurv");
  await main(page).getByTestId("one-click-fix").first().click();
  await expect(status).toHaveAttribute("data-ok", "true");
  await expect(main(page).getByTestId("green-check")).toBeVisible();
});

test("BUDGET_TOO_LOW gives a friendly message with a way back", async ({ request }) => {
  const res = await request.post("/api/generate", {
    data: { needs: { budgetNok: 4000, includeOs: true, uses: ["GAMING"], games: [], resolution: "1080p", targetHz: 60, preferences: {}, longevityYears: 3, assemblyService: false } },
  });
  expect(res.status()).toBe(422);
  const body = await res.json();
  expect(body.reason).toBe("BUDGET_TOO_LOW");
  expect(body.message).toMatch(/^Det laveste vi får til/);
});

test("invalid API input gives 400 with field errors", async ({ request }) => {
  const res = await request.post("/api/generate", { data: { needs: { budgetNok: "mange" } } });
  expect(res.status()).toBe(400);
  expect((await res.json()).fields).toBeDefined();
});

/** Next 16 keeps previous routes mounted but hidden – always scope to the visible page. */
function main(page: Page) {
  return page.getByRole("main");
}
