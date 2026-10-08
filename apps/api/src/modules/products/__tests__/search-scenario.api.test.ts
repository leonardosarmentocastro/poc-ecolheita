import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { startServer, stopServer } from "@test/helpers";
import { seedSearchScenario } from "@/db/seed";
import { scenarioClassifier } from "@/modules/products/fixtures/scenario-classifier";
import {
  EXPECTED_TIERS,
  SEARCH_SCENARIO,
  scenarioRow,
} from "@/modules/products/fixtures/search-scenario";

// Seeded in fixture order: row N of the spec table has id N.
const idOf = (key: string) => SEARCH_SCENARIO.indexOf(scenarioRow(key)) + 1;

describe("the search scenario, tiered", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    ({ server, base } = await startServer({ classifier: scenarioClassifier }));
  });
  afterAll(async () => {
    await stopServer(server);
  });
  beforeEach(async () => {
    await seedSearchScenario();
  });

  it.each(["banana", "bolo"] as const)(
    "%s answers exactly the expected tiers, cheapest first",
    async (q) => {
      const body = await (await fetch(`${base}/products/search?q=${q}`)).json();
      expect(body.tiered).toBe(true);
      expect(body.matches.map((p: { id: number }) => p.id)).toEqual(
        EXPECTED_TIERS[q].matches.map(idOf),
      );
      expect(body.related.map((p: { id: number }) => p.id)).toEqual(
        EXPECTED_TIERS[q].related.map(idOf),
      );
    },
  );
});
