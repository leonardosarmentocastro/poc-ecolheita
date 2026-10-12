import { pool } from "@/db/client";
import { SEARCH_SCENARIO } from "@/modules/products/fixtures/search-scenario";
import { productsRepository } from "@/modules/products/repository";

/** Wipes products and inserts the search scenario through the one write path. */
export const seedSearchScenario = async (): Promise<void> => {
  await pool.query("TRUNCATE TABLE products RESTART IDENTITY CASCADE");
  for (const row of SEARCH_SCENARIO) {
    const { key: _key, ...input } = row;
    await productsRepository.create(input);
  }
};
