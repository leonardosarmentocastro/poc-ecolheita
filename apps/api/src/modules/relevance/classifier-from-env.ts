import type { Env } from "@/config/env";
import { scenarioClassifier } from "@/modules/products/fixtures/scenario-classifier";
import { createJevClassifier } from "@/modules/relevance/jev-classifier";
import type { Classifier } from "@/modules/relevance/types";

/** Scenario wins (e2e must never reach a dev key), then Jev, then none. */
export const classifierFromEnv = (
  env: Partial<Pick<Env, "SEARCH_CLASSIFIER" | "TYPESAFE_API_KEY">>,
): Classifier | null => {
  if (env.SEARCH_CLASSIFIER === "scenario") return scenarioClassifier;
  if (env.TYPESAFE_API_KEY) return createJevClassifier({ apiKey: env.TYPESAFE_API_KEY });
  return null;
};
