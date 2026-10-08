import { TIER_CRITERIA } from "@/modules/relevance/criteria";
import type { Classifier, Tier } from "@/modules/relevance/types";

export const JEV_URL = "https://api.typesafe.ai/v1/systemone";
/** Pinned (spec § Jev implementation): an upgrade is a deliberate change, re-checked by tiers:eval. */
export const JEV_MODEL = "jev-1.13.0";
export const JEV_TIMEOUT_MS = 2000;

/** TypeSafe Jev as the search classifier: one request per search, one choice per candidate. */
export const createJevClassifier = ({
  apiKey,
  url = JEV_URL,
  timeoutMs = JEV_TIMEOUT_MS,
  model = JEV_MODEL,
}: {
  apiKey: string;
  url?: string;
  timeoutMs?: number;
  model?: string;
}): Classifier => ({
  async classify(query, candidates) {
    const ids = candidates.map((_, i) => `q${i + 1}`);
    const body = {
      model,
      state: `A shopper searched a street-market app for: ${JSON.stringify(query)}`,
      questions: Object.fromEntries(
        candidates.map((c, i) => [
          ids[i],
          {
            type: "choice",
            instructions: `For this search, what is the product ${JSON.stringify(c.name)}?`,
            criteria: TIER_CRITERIA,
          },
        ]),
      ),
    };
    void timeoutMs; // used from Task 2
    const res = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const parsed: { answers: Record<string, { choice: Tier }> } = await res.json();
    return new Map(candidates.map((c, i) => [c.id, parsed.answers[ids[i]].choice]));
  },
});
