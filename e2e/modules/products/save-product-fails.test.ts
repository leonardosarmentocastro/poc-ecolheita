import { test, expect } from "../../fixtures/test";

test("a failed save keeps the drawer open and says the product was not saved", async ({ page }) => {
  // The API refusing the write is what this proves the page survives; the route stands in for it.
  // No drawer transition, so a drawer that closes is hidden at once rather than mid-fade.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/products", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 500, json: { error: "internal_error" } })
      : route.fallback(),
  );
  await page.goto("/produtos");
  await expect(page.getByText("Nenhum produto cadastrado.")).toBeVisible();

  await page.getByRole("button", { name: "Novo produto" }).click();
  const drawer = page.getByRole("dialog", { name: "Novo produto" });
  await drawer.getByLabel("Loja").fill("VEC Hortifruti");
  await drawer.getByLabel("Nome do produto").fill("Banana prata");
  await drawer.getByLabel("Preço (R$)").fill("5,00");
  await drawer.getByRole("button", { name: "Salvar" }).click();

  await expect(drawer.getByRole("alert")).toHaveText("Não foi possível salvar o produto.");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByLabel("Nome do produto")).toHaveValue("Banana prata");
  await expect(page.getByText("Nenhum produto cadastrado.")).toBeVisible();
});
