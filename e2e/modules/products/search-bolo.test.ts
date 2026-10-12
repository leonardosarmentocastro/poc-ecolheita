import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../fixtures/test";
import { seedProduct } from "../../fixtures/seed";
import {
  EXPECTED_TIERS,
  SEARCH_SCENARIO,
  scenarioRow,
} from "../../../apps/api/src/modules/products/fixtures/search-scenario";

async function seedScenario(request: APIRequestContext) {
  for (const row of SEARCH_SCENARIO) {
    const { key: _key, ...input } = row;
    await seedProduct(request, input);
  }
}

const nameOf = (key: string) => scenarioRow(key).name;

async function searchFor(page: import("@playwright/test").Page, q: string) {
  await page.getByRole("searchbox", { name: "Nome do produto" }).fill(q);
  await page.getByRole("button", { name: "Buscar" }).click();
}

test.describe("searching for bolo", () => {
  test.beforeEach(async ({ request, page }) => {
    await seedScenario(request);
    await page.goto("/buscar");
    await expect(page.getByText("Digite o nome de um produto")).toBeVisible();
    await searchFor(page, "bolo");
    await expect(
      page.getByRole("heading", { name: "Encontramos 3 produtos para “bolo”" }),
    ).toBeVisible();
  });

  test("the cakes, then the related products, cheapest first, and no battery", async ({ page }) => {
    const found = page.getByRole("heading", { name: "Encontramos 3 produtos para “bolo”" });
    const also = page.getByRole("heading", { name: "Você também pode gostar" });
    await expect(also).toBeVisible();
    const order = await page
      .locator("article, h2")
      .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label") ?? el.textContent));
    const after = (h: string) => order.indexOf(h);
    const matches = EXPECTED_TIERS.bolo.matches.map(nameOf);
    const related = EXPECTED_TIERS.bolo.related.map(nameOf);
    expect(order.filter((x) => matches.includes(x!))).toEqual(matches);
    expect(order.filter((x) => related.includes(x!))).toEqual(related);
    expect(Math.min(...related.map(after))).toBeGreaterThan(after((await also.textContent())!));
    expect(Math.max(...matches.map(after))).toBeLessThan(after((await also.textContent())!));
    expect(after((await found.textContent())!)).toBeLessThan(Math.min(...matches.map(after)));
    await expect(page.getByRole("article", { name: "Pilha AA" })).toHaveCount(0);
    await expect(page.getByText(/Não conseguimos organizar/)).toHaveCount(0);
  });

  // Relies on `retry: false` in useProductSearch: the alert must appear inside Playwright's
  // five-second expect window, not after react-query's default retries.
  test("a failed search shows an error and keeps the previous results", async ({ page }) => {
    const before = await page.getByRole("article").count();
    expect(before).toBe(5);
    await page.route("**/products/search**", (route) => route.abort());
    await searchFor(page, "maçã");
    // Scoped to the page body: Next's route announcer is a second, empty `alert` region.
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "Não foi possível buscar. Tente novamente.",
    );
    await expect(page.getByRole("article")).toHaveCount(before);
    // The kept cards are still headed by the search they answered, not the one that failed.
    await expect(
      page.getByRole("heading", { name: "Encontramos 3 produtos para “bolo”" }),
    ).toBeVisible();
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
    await searchFor(page, "bolo");
    const alert = page.getByRole("main").getByRole("alert");
    await expect(alert).toHaveText("Não foi possível buscar. Tente novamente.");
    await expect(page.getByRole("article")).toHaveCount(0);

    await page.unroute("**/products/search**");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(alert).toHaveCount(0);
    await expect(page.getByRole("article").first()).toContainText("R$ 8,00");
  });
});
