import { TIER_CRITERIA } from "@/modules/relevance/criteria";
import { ClassifierError, type Classifier, type Tier } from "@/modules/relevance/types";

export const JEV_URL = "https://api.typesafe.ai/v1/systemone";
/** Pinned (spec § Jev implementation): an upgrade is a deliberate change, re-checked by tiers:eval. */
export const JEV_MODEL = "jev-1.13.0";
export const JEV_TIMEOUT_MS = 2000;

const TIERS: readonly Tier[] = ["match", "related", "unrelated"];
const isAbort = (err: unknown) => ["TimeoutError", "AbortError"].includes((err as Error)?.name);

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
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      throw new ClassifierError(isAbort(err) ? "timeout" : "unexpected");
    }
    if (!res.ok) {
      // Release the connection: an unread body holds the socket until GC.
      await res.body?.cancel().catch(() => {});
      throw new ClassifierError("status");
    }

    let parsed: { answers?: Record<string, { choice?: unknown }> };
    try {
      parsed = await res.json();
    } catch (err) {
      throw new ClassifierError(isAbort(err) ? "timeout" : "invalid");
    }

    const tiers = new Map<number, Tier>();
    candidates.forEach((c, i) => {
      const choice = parsed.answers?.[ids[i]]?.choice;
      if (!TIERS.includes(choice as Tier)) throw new ClassifierError("invalid");
      tiers.set(c.id, choice as Tier);
    });
    return tiers;
  },
});
