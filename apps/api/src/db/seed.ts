import { pool } from "@/db/client";
import { BANANA_SCENARIO } from "@/modules/products/fixtures/banana-scenario";
import { productsRepository } from "@/modules/products/repository";

/** Wipes products and inserts the banana scenario through the one write path. */
export const seedBananaScenario = async (): Promise<void> => {
  await pool.query("TRUNCATE TABLE products RESTART IDENTITY CASCADE");
  for (const row of BANANA_SCENARIO) {
    const { key: _key, ...input } = row;
    await productsRepository.create(input);
  }
};
