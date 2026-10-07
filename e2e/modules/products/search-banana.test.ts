import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../fixtures/test";
import { seedProduct } from "../../fixtures/seed";
import {
  BANANA_QUERY,
  BANANA_SCENARIO,
  EXPECTED_MATCH_KEYS_IN_ORDER,
  HARD_DECOY_KEYS,
  SOFT_DECOY_KEY,
  scenarioRow,
} from "../../../apps/api/src/modules/products/fixtures/banana-scenario";

// Resolved at load, not in the expected-failure body: a broken fixture must fail the file,
// not pass as the expected failure.
const SOFT_DECOY_NAME = scenarioRow(SOFT_DECOY_KEY).name;

async function seedScenario(request: APIRequestContext) {
  for (const row of BANANA_SCENARIO) {
    const { key: _key, ...input } = row;
    await seedProduct(request, input);
  }
}

test.describe("searching for banana", () => {
  test.beforeEach(async ({ request, page }) => {
    await seedScenario(request);
    await page.goto("/buscar");
    await expect(page.getByText("Digite o nome de um produto")).toBeVisible();
    await page.getByRole("searchbox", { name: "Nome do produto" }).fill(BANANA_QUERY);
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByRole("article").first()).toBeVisible();
  });

  test("hard: the five matches come first, cheapest first, and the hard decoys are absent", async ({
    page,
  }) => {
    const names = await page
      .getByRole("article")
      .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
    expect(names.slice(0, EXPECTED_MATCH_KEYS_IN_ORDER.length)).toEqual(
      EXPECTED_MATCH_KEYS_IN_ORDER.map((k) => scenarioRow(k).name),
    );
    for (const key of HARD_DECOY_KEYS) expect(names).not.toContain(scenarioRow(key).name);
    await expect(page.getByRole("article").first()).toContainText("R$ 1,60");
  });

  // Expected failure (spec § The proof scenario): "Bolo de banana" scores 0.9157 against
  // "banana", above the lowest match (0.7899), so no threshold can exclude it. The
  // similarity table is in the slice 2 PR body.
  // The body asserts only that absence, so the test fails for that reason alone; the five
  // matches and the hard decoys are proven by the hard test above.
  test("bolo de banana is absent", async ({ page }) => {
    test.fail();
    const names = await page
      .getByRole("article")
      .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
    expect(names).not.toContain(SOFT_DECOY_NAME);
  });

  // Relies on `retry: false` in useProductSearch: the alert must appear inside Playwright's
  // five-second expect window, not after react-query's default retries.
  test("a failed search shows an error and keeps the previous results", async ({ page }) => {
    const before = await page.getByRole("article").count();
    expect(before).toBeGreaterThanOrEqual(4);
    await page.route("**/products/search**", (route) => route.abort());
    await page.getByRole("searchbox", { name: "Nome do produto" }).fill("maçã");
    await page.getByRole("button", { name: "Buscar" }).click();
    // Scoped to the page body: Next's route announcer is a second, empty `alert` region.
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "Não foi possível buscar. Tente novamente.",
    );
    await expect(page.getByRole("article")).toHaveCount(before);
  });
});

test.describe("retrying a failed search", () => {
  // "Tente novamente" means pressing Buscar again with the same text must search again.
  test("pressing Buscar again with the same text after a failure shows the results", async ({
    request,
    page,
  }) => {
    await seedScenario(request);
    await page.goto("/buscar");
    await page.route("**/products/search**", (route) => route.abort());
    await page.getByRole("searchbox", { name: "Nome do produto" }).fill(BANANA_QUERY);
    await page.getByRole("button", { name: "Buscar" }).click();
    // Scoped to the page body: Next's route announcer is a second, empty `alert` region.
    const alert = page.getByRole("main").getByRole("alert");
    await expect(alert).toHaveText("Não foi possível buscar. Tente novamente.");
    await expect(page.getByRole("article")).toHaveCount(0);

    await page.unroute("**/products/search**");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(alert).toHaveCount(0);
    await expect(page.getByRole("article").first()).toContainText("R$ 1,60");
  });
});
