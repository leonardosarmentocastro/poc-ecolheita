import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { startServer, stopServer } from "@test/helpers";
import { seedMarketplaceCorpus } from "@/db/seed";
import { CORPUS, SITE_SHOP_NAME } from "@/modules/products/fixtures/marketplace-corpus";

describe("the marketplace corpus, seeded", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer()); // no classifier: untiered
  });
  afterAll(async () => {
    await stopServer(server);
  });
  beforeEach(async () => {
    await seedMarketplaceCorpus();
  });

  it("reaches a search: uva answers untiered with 20 corpus rows from both sites", async () => {
    const res = await fetch(`${base}/products/search?q=uva`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      tiered: boolean;
      results: { shopName: string; name: string }[];
    };
    expect(body.tiered).toBe(false);
    expect(body.results).toHaveLength(20);
    const shops = new Set(body.results.map((p) => p.shopName));
    expect(shops.has(SITE_SHOP_NAME["amazon-now"])).toBe(true);
    expect(shops.has(SITE_SHOP_NAME["mercado-livre"])).toBe(true);
    const corpusNames = new Set(CORPUS.map((r) => r.name));
    for (const p of body.results) expect(corpusNames.has(p.name)).toBe(true);
  });

  it("holds exactly the corpus: one product per corpus row, in fixture order", async () => {
    const res = await fetch(`${base}/products`);
    const all = (await res.json()) as { id: number; name: string }[];
    expect(all).toHaveLength(CORPUS.length);
    const byId = [...all].sort((a, b) => a.id - b.id);
    expect(byId.map((p) => p.name)).toEqual(CORPUS.map((r) => r.name));
  });
});
