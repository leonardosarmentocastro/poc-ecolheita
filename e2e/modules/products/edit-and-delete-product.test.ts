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

test("renaming Banana to Maçã shows the new name in search", async ({ page, request }) => {
  await seedScenario(request);
  await page.goto("/produtos");
  // Role names match substrings, so "Editar Banana" also matches "Editar Banana prata";
  // `exact` keeps strict mode to one button.
  await page.getByRole("button", { name: "Editar Banana", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Editar produto" });
  await expect(drawer.getByLabel("Nome do produto")).toHaveValue("Banana");
  await drawer.getByLabel("Nome do produto").fill("Maçã");
  await drawer.getByRole("button", { name: "Salvar" }).click();
  await expect(drawer).toBeHidden();
  // "Maçã argentina" is also a row; filter by the shop to name exactly one.
  const renamed = page
    .getByRole("row")
    .filter({ hasText: "Mercadinho Candelária" })
    .filter({ hasText: "Maçã" });
  await expect(renamed).toHaveCount(1);
  await expect(renamed).not.toContainText("argentina");

  await page.goto("/buscar");
  await page.getByRole("searchbox", { name: "Nome do produto" }).fill("banana");
  await page.getByRole("button", { name: "Buscar" }).click();
  const card = page
    .getByRole("article", { name: "Maçã", exact: true })
    .filter({ hasText: "Mercadinho Candelária" });
  await expect(card).toHaveCount(1);
  await expect(page.getByRole("article", { name: "Banana", exact: true })).toHaveCount(0);
});

test("deleting a product removes its row", async ({ page, request }) => {
  await seedProduct(request, {
    shopName: "VEC Hortifruti",
    name: "Banana prata",
    price: 500,
    quantity: 10,
    discountPercentage: 30,
  });
  await page.goto("/produtos");
  await page.getByRole("button", { name: "Excluir Banana prata" }).click();
  const dialog = page.getByRole("dialog", { name: "Excluir produto" });
  await dialog.getByRole("button", { name: "Excluir" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Nenhum produto cadastrado.")).toBeVisible();
});
