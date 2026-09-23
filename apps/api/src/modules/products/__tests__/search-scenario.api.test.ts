import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { startServer, stopServer } from "@test/helpers";
import { seedBananaScenario } from "@/db/seed";
import {
  BANANA_QUERY,
  EXPECTED_MATCH_KEYS_IN_ORDER,
  HARD_DECOY_KEYS,
  SOFT_DECOY_KEY,
  scenarioRow,
} from "@/modules/products/fixtures/banana-scenario";
import { productsRepository } from "@/modules/products/repository";

type Hit = { id: number; name: string; shopName: string; similarity: number };

describe("the banana scenario", () => {
  let server: Server;
  let base: string;
  let idOf: (key: string) => number;
  let softDecoyId: number;
  let hits: Hit[];

  beforeAll(async () => {
    ({ server, base } = await startServer());
  });
  afterAll(async () => {
    await stopServer(server);
  });

  beforeEach(async () => {
    await seedBananaScenario();
    const all = await productsRepository.findAll();
    idOf = (key) => {
      const row = scenarioRow(key);
      const found = all.find((p) => p.name === row.name && p.shopName === row.shopName);
      if (!found) throw new Error(`scenario row ${key} not seeded`);
      return found.id;
    };
    // Resolved here, not in the expected-failure body: a seeding break must fail the suite,
    // not pass as the expected failure.
    softDecoyId = idOf(SOFT_DECOY_KEY);
    hits = await (
      await fetch(`${base}/products/search?q=${encodeURIComponent(BANANA_QUERY)}`)
    ).json();
  });

  it("hard: the first five results are the five matches, cheapest first", () => {
    expect(hits.slice(0, EXPECTED_MATCH_KEYS_IN_ORDER.length).map((h) => h.id)).toEqual(
      EXPECTED_MATCH_KEYS_IN_ORDER.map(idOf),
    );
  });

  it("hard: maçã and carne moída are absent", () => {
    const ids = hits.map((h) => h.id);
    for (const key of HARD_DECOY_KEYS) expect(ids).not.toContain(idOf(key));
  });

  // Expected failure (spec § The proof scenario): "Bolo de banana" scores 0.9157 against
  // "banana", above the lowest match ("Banana prata orgânica", 0.7899), so no threshold
  // keeps all five matches and excludes it. The similarity table is in the slice 2 PR body.
  // The body asserts only that absence, so the test fails for that reason alone; the five
  // matches and the hard decoys are proven by the hard tests above.
  it.fails("bolo de banana is absent", () => {
    expect(hits.map((h) => h.id)).not.toContain(softDecoyId);
  });
});
