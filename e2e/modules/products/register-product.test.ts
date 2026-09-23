import { test, expect } from "../../fixtures/test";

test("registering a product shows it in the table with its final price", async ({ page }) => {
  await page.goto("/produtos");
  await expect(page.getByRole("heading", { name: "Produtos" })).toBeVisible();
  await expect(page.getByText("Nenhum produto cadastrado.")).toBeVisible();

  await page.getByRole("button", { name: "Novo produto" }).click();
  const drawer = page.getByRole("dialog", { name: "Novo produto" });
  await drawer.getByLabel("Loja").fill("VEC Hortifruti");
  await drawer.getByLabel("Nome do produto").fill("Banana prata");
  await drawer.getByLabel("Preço (R$)").fill("5,00");
  await drawer.getByLabel("Quantidade em estoque").fill("10");
  await drawer.getByLabel("Desconto (%)").fill("30");
  await drawer.getByRole("button", { name: "Salvar" }).click();

  await expect(drawer).toBeHidden();
  const row = page.getByRole("row", { name: /Banana prata/ });
  await expect(row).toContainText("VEC Hortifruti");
  await expect(row).toContainText("R$ 3,50");
  await expect(row).toContainText("30% off");
  await expect(row).toContainText("10 un.");
});
