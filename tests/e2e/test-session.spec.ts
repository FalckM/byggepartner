// Phase 6 gate — a simulated moderated test session produces the right numbers in /admin/analyse.
import { expect, test, type Page } from "@playwright/test";
import { expectAccessible } from "./helpers";

const main = (page: Page) => page.getByRole("main");

test("moderated test session → events → confidence → analysis", async ({ page, request }) => {
  test.setTimeout(120_000);
  const code = `RESP-${100 + Math.floor(Math.random() * 899)}`;

  // Moderator starts the session
  await page.goto("/test");
  await expectAccessible(page, "test");
  await page.getByLabel("Deltakerkode").fill(code);
  await page.getByLabel("Segment").selectOption("Lavbudsjett");
  await page.getByRole("button", { name: /Start testøkt/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("test-bar")).toContainText(code);

  // Participant solves the task
  await main(page).getByRole("link", { name: "Hjelp meg å velge" }).click();
  await page.getByRole("button", { name: "14 000 kr" }).click();
  await page.getByRole("button", { name: "Neste" }).click();
  await page.getByRole("checkbox", { name: "Spill" }).check();
  await page.getByRole("button", { name: "Neste" }).click();
  await page.getByRole("checkbox", { name: /Counter-Strike 2/ }).check();
  await page.getByRole("button", { name: "Neste" }).click();
  await page.getByRole("button", { name: "Neste" }).click();
  await page.getByRole("button", { name: "Vis PC-ene mine" }).click();
  await expect(page).toHaveURL(/\/pakke\//, { timeout: 20_000 });
  await main(page).getByTestId("add-to-cart").click();
  await expect(main(page).getByTestId("green-check")).toBeVisible();
  await main(page).getByTestId("to-checkout").click();
  await page.getByLabel("Fullt navn").fill("Test");
  await page.getByLabel("Adresse").fill("Test");
  await page.getByLabel("Postnummer").fill("4630");
  await page.getByLabel("Poststed").fill("Test");
  await page.getByRole("button", { name: "Fullfør (simulert)" }).click();

  // Confidence question
  await expect(page).toHaveURL(/\/test\/avslutt$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Bra! Du fullførte bestillingen." })).toBeVisible();
  await expect(page.getByLabel("Oppgaven ble fullført")).toBeChecked();
  await expectAccessible(page, "avslutt");
  await page.getByLabel("4 – Trygg").check({ force: true });
  await page.getByLabel(/Notater/).fill("E2E-simulert økt");
  await page.getByRole("button", { name: "Lagre og avslutt testøkten" }).click();
  await expect(page.getByTestId("session-finished")).toContainText(code);

  // Analysis shows exactly this session's numbers
  await page.goto("/admin/analyse?kilde=test");
  const row = page.locator(`[data-testid="session-row"][data-code="${code}"]`);
  await expect(row).toBeVisible();
  await expect(row).toContainText("Lavbudsjett");
  await expect(row.locator('[data-col="completed"]')).toHaveText(/Ja/);
  await expect(row.locator('[data-col="green"]')).toHaveText(/Ja/);
  await expect(row.locator('[data-col="confidence"]')).toHaveText("4");
  await expect(row.locator('[data-col="errors"]')).toHaveText("0");
  await expect(row.locator('[data-col="ttp"]')).toHaveText(/^\d+ s$/);
  await expect(row).toContainText("E2E-simulert økt");
  const funnel = page.getByTestId("funnel");
  for (const stage of ["Startet veiviseren", "Så PC-forslag", "Åpnet handlekurven", "Gikk til kassen", "Fullførte bestilling"]) {
    await expect(funnel.getByText(stage)).toBeVisible();
  }
  await expectAccessible(page, "analyse");

  // The CSV export contains the session
  const csv = await (await request.get("/api/admin/export?type=summary")).text();
  expect(csv).toContain(code);
  expect(csv.split("\n")[0]).toContain("participantCode");
});

test("events API validates input and ignores unknown sessions", async ({ request }) => {
  const ok = await request.post("/api/events", {
    data: { anonymousId: "anon-e2e", sessionId: "does-not-exist", events: [{ type: "package_viewed", payload: {}, ts: Date.now() }] },
  });
  expect(ok.status()).toBe(204);
  const bad = await request.post("/api/events", { data: { anonymousId: "anon-e2e", events: [{ type: "hacked", ts: 1 }] } });
  expect(bad.status()).toBe(400);
});
