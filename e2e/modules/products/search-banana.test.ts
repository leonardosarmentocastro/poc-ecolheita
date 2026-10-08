import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../fixtures/test";
import { seedProduct } from "../../fixtures/seed";
import { SEARCH_SCENARIO } from "../../../apps/api/src/modules/products/fixtures/search-scenario";

async function seedScenario(request: APIRequestContext) {
  for (const row of SEARCH_SCENARIO) {
    const { key: _key, ...input } = row;
    await seedProduct(request, input);
  }
}

test.describe("searching for banana", () => {
  test.beforeEach(async ({ request, page }) => {
    await seedScenario(request);
    await page.goto("/buscar");
    await expect(page.getByText("Digite o nome de um produto")).toBeVisible();
    await page.getByRole("searchbox", { name: "Nome do produto" }).fill("banana");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByRole("article").first()).toBeVisible();
  });

  test("the answer is untiered: the notice and the banana offers, without similarity", async ({
    page,
  }) => {
    await expect(
      page.getByText("Não conseguimos organizar os resultados por relevância"),
    ).toBeVisible();
    const names = await page
      .getByRole("article")
      .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
    for (const name of ["Banana", "Banana prata", "Banana nanica", "Banana prata orgânica"])
      expect(names).toContain(name);
    await expect(page.getByText(/similaridade/)).toHaveCount(0);
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
    await page.getByRole("searchbox", { name: "Nome do produto" }).fill("banana");
    await page.getByRole("button", { name: "Buscar" }).click();
    // Scoped to the page body: Next's route announcer is a second, empty `alert` region.
    const alert = page.getByRole("main").getByRole("alert");
    await expect(alert).toHaveText("Não foi possível buscar. Tente novamente.");
    await expect(page.getByRole("article")).toHaveCount(0);

    await page.unroute("**/products/search**");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(alert).toHaveCount(0);
    await expect(page.getByRole("article", { name: "Banana prata orgânica" })).toBeVisible();
  });
});
