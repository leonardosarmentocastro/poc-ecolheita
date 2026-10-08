import type { Classifier, Tier } from "@/modules/relevance";
import {
  EXPECTED_TIERS,
  scenarioRow,
  type ScenarioQuery,
} from "@/modules/products/fixtures/search-scenario";
import { normalizeForSearch } from "@/modules/products/utils/normalize-for-search";

const TIERS = new Map<string, Tier>();
for (const [query, { matches, related }] of Object.entries(EXPECTED_TIERS) as [
  ScenarioQuery,
  { matches: string[]; related: string[] },
][]) {
  for (const key of matches)
    TIERS.set(`${query}|${normalizeForSearch(scenarioRow(key).name)}`, "match");
  for (const key of related)
    TIERS.set(`${query}|${normalizeForSearch(scenarioRow(key).name)}`, "related");
}

/**
 * The search scenario's expected tiers as a classifier (spec § The classifier seam). For
 * tests and e2e only (`SEARCH_CLASSIFIER=scenario`): a pair the fixture does not list is
 * unrelated.
 */
export const scenarioClassifier: Classifier = {
  async classify(query, candidates) {
    const q = normalizeForSearch(query);
    return new Map(
      candidates.map((c) => [c.id, TIERS.get(`${q}|${normalizeForSearch(c.name)}`) ?? "unrelated"]),
    );
  },
};
