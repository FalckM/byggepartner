// Phase 5 gate: S11 green in the UI (upgrade), expert mode, compatibility map, «Spør en PC-bygger», /bygg filters.
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll, expectNoJargon } from "./helpers";

const main = (page: Page) => page.getByRole("main");

async function packageUrl(request: APIRequestContext) {
  const res = await request.post("/api/generate", {
    data: { needs: { budgetNok: 14000, includeOs: true, uses: ["GAMING", "STUDY"], games: ["cs2"], resolution: "1080p", targetHz: 144, preferences: {}, longevityYears: 5, assemblyService: false } },
  });
  expect(res.ok()).toBe(true);
  return `/pakke/${(await res.json()).buildId}`;
}

test("S11 in the UI: upgrade an AM4 PC with a new graphics card (US-18, RESP-07)", async ({ page }) => {
  await page.goto("/oppgrader");
  await expectAccessible(page, "oppgrader");
  await expectNoHorizontalScroll(page);
  await page.getByRole("combobox", { name: "Prosessor (hjernen)", exact: true }).selectOption("cpu-amd-ryzen-5-5600");
  await page.getByRole("combobox", { name: "Hovedkort (kobler alt sammen)", exact: true }).selectOption("mb-b550-atx");
  await page.getByRole("combobox", { name: "Minne (korttidshukommelsen)", exact: true }).selectOption("ram-ddr4-16-3200");
  await page.getByRole("combobox", { name: "Lagring (der filer og spill bor)", exact: true }).selectOption("ssd-nvme-1tb-gen4");
  await page.getByRole("combobox", { name: "Strømforsyning", exact: true }).selectOption("psu-550-bronze");
  await page.getByRole("combobox", { name: "Kabinett (kassen)", exact: true }).selectOption("case-budget-atx-airflow");
  await expect(page.getByRole("combobox", { name: "Skjermkort (grafikken i spill)", exact: true })).toBeDisabled(); // being upgraded
  await page.getByLabel("Budsjett for nye deler").fill("6000");
  await page.getByRole("checkbox", { name: "Fortnite" }).check();
  await page.getByRole("checkbox", { name: "Counter-Strike 2" }).check();
  await page.getByRole("button", { name: "Vis forslag som passer" }).click();

  await expect(page).toHaveURL(/\/pakke\//, { timeout: 20_000 });
  await expect(main(page).getByTestId("upgrade-note")).toContainText("Har fra før");
  await expect(main(page).getByTestId("fit-status")).toHaveAttribute("data-ok", "true");
  const total = Number((await main(page).getByTestId("sticky-total").innerText()).replace(/\D/g, ""));
  expect(total).toBeLessThanOrEqual(6000);
  await expect(main(page).getByTestId("part-row").filter({ hasText: "Har fra før" })).toHaveCount(6);
  const gpu = main(page).locator('[data-testid="part-row"][data-category="GPU"]');
  await expect(gpu).not.toContainText("Har fra før");
});

test("expert mode shows technical numbers; standard mode stays jargon-free (US-14)", async ({ page, request }) => {
  await page.goto(await packageUrl(request));
  await expect(main(page).getByTestId("tech-specs")).toHaveCount(0);
  await expectNoJargon(page, "standardmodus");

  await page.getByRole("switch", { name: "Ekspertmodus" }).click();
  const specs = main(page).getByTestId("tech-specs");
  await expect(specs.first()).toBeVisible();
  await expect(main(page).locator('[data-testid="part-row"][data-category="CPU"]').getByTestId("tech-specs")).toContainText(/AM\d|LGA\d+/);
  await expect(main(page).locator('[data-testid="part-row"][data-category="PSU"]').getByTestId("tech-specs")).toContainText(/\d+ W/);

  await page.reload(); // persisted
  await expect(main(page).getByTestId("tech-specs").first()).toBeVisible();
  await page.getByRole("switch", { name: "Ekspertmodus" }).click();
  await expect(main(page).getByTestId("tech-specs")).toHaveCount(0);
  await expectNoJargon(page, "standardmodus igjen");
});

test("compatibility map: wires are keyboard-reachable and explain the check (US-21)", async ({ page, request }) => {
  await page.goto(await packageUrl(request));
  await main(page).getByText("Se hvordan delene henger sammen").click();
  const map = main(page).getByTestId("compat-map");
  const edges = map.getByTestId("compat-edge");
  expect(await edges.count()).toBeGreaterThan(5);
  await expect(map.locator('[data-status="ERROR"]')).toHaveCount(0);
  const cpuMb = map.getByRole("button", { name: "Prosessor og Hovedkort: passer" });
  await cpuMb.focus();
  await page.keyboard.press("Enter");
  await expect(map.getByTestId("compat-detail")).toContainText("Prosessoren passer i hovedkortet");
  await expectAccessible(page, "kompatibilitetskart");
});

test("«Spør en PC-bygger» answers based on the cart (US-19)", async ({ page, request }) => {
  await page.goto(await packageUrl(request));
  await main(page).getByTestId("add-to-cart").click();
  await expect(page).toHaveURL(/handlekurv/);
  await main(page).getByRole("button", { name: /Spør en PC-bygger/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Passer alt sammen?" }).click();
  await expect(dialog.getByTestId("builder-chat")).toContainText("Ja. Vi har sjekket");
  await dialog.getByLabel("Skriv et eget spørsmål").fill("Kan jeg bruke min gamle skjerm?");
  await dialog.getByRole("button", { name: "Send" }).click();
  await expect(dialog.getByTestId("builder-chat")).toContainText("svarer vanligvis innen 2 timer");
  await expectAccessible(page, "spør en PC-bygger");
});

test("/bygg goes one part at a time and hides parts that do not fit", async ({ page }) => {
  await page.goto("/bygg");
  await main(page).getByRole("button", { name: "Tøm" }).click();
  await expect(main(page).getByRole("heading", { name: "Velg prosessor" })).toBeVisible();
  await expect(main(page).getByText("Steg 1 av 10")).toBeVisible();
  await expectNoJargon(page, "bygg: prosessor");

  // Picking a part fills it in the drawing and moves on to the next step.
  await main(page).locator('[data-testid="builder-row"]').first().getByRole("button", { name: /^Velg / }).click();
  await expect(main(page).getByRole("heading", { name: "Velg hovedkort" })).toBeFocused();
  await expect(main(page).locator('.pc-part[data-category="CPU"][data-state="filled"]').last()).toBeAttached();

  // Only parts that fit are listed; the rest sit behind a closed «Passer ikke» section.
  await expect(main(page).locator('[data-testid="builder-list"] [data-fits="false"]')).toHaveCount(0);
  const nofit = main(page).getByTestId("builder-nofit");
  await expect(nofit).not.toHaveAttribute("open", "");
  await expect(nofit.locator('[data-testid="builder-row"]').first()).toBeHidden();
  await expectAccessible(page, "bygg: hovedkort");
});
