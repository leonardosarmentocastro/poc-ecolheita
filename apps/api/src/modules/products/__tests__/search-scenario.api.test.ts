import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { startServer, stopServer } from "@test/helpers";
import { seedSearchScenario } from "@/db/seed";
import { SEARCH_SCENARIO } from "@/modules/products/fixtures/search-scenario";

// Slice 1: no classifier, so every answer is untiered. With 14 rows under the cap of 20,
// this proves the route serves the scenario; relevance is proven in shortlist.test.ts.
describe("the search scenario, untiered", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer());
  });
  afterAll(async () => {
    await stopServer(server);
  });
  beforeEach(async () => {
    await seedSearchScenario();
  });

  it.each(["banana", "bolo"])("%s returns every in-stock scenario row, untiered", async (q) => {
    const body = await (await fetch(`${base}/products/search?q=${q}`)).json();
    expect(body.tiered).toBe(false);
    expect(new Set(body.results.map((p: { name: string }) => p.name))).toEqual(
      new Set(SEARCH_SCENARIO.map((r) => r.name)),
    );
  });
});
