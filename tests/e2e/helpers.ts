import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { findJargon } from "../../lib/engine/explain";

/** WCAG 2.2 AA – 0 serious/critical violations (spec 13). */
export async function expectAccessible(page: Page, label: string) {
  const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const bad = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`), `axe on ${label}`).toEqual([]);
}

/** Standard mode: no «sokkel», «PCIe», «TDP», «chipset» (spec 13). */
export async function expectNoJargon(page: Page, label: string) {
  const text = await page.getByRole("main").innerText();
  expect(findJargon(text), `jargon on ${label}`).toEqual([]);
}

/** No horizontal page scroll (spec 13: 360 px). */
export async function expectNoHorizontalScroll(page: Page) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(sw).toBeLessThanOrEqual(cw);
}
