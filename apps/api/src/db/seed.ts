import { pool } from "@/db/client";
import { CORPUS, SITE_SHOP_NAME } from "@/modules/products/fixtures/marketplace-corpus";
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

/**
 * Wipes products and inserts the marketplace corpus through the one write path, in fixture
 * order (spec § Seeding): ids follow the fixture, so the shortlist's id tie-break is reproducible.
 */
export const seedMarketplaceCorpus = async (): Promise<void> => {
  await pool.query("TRUNCATE TABLE products RESTART IDENTITY CASCADE");
  for (const row of CORPUS) {
    await productsRepository.create({
      shopName: SITE_SHOP_NAME[row.site],
      name: row.name,
      price: row.priceCents,
      quantity: 10,
      discountPercentage: 0,
    });
  }
};
