import type { Env } from "@/config/env";
import { scenarioClassifier } from "@/modules/products/fixtures/scenario-classifier";
import type { Classifier } from "@/modules/relevance/types";

/** The classifier the env selects, or none (spec § The classifier seam). */
export const classifierFromEnv = (
  env: Partial<Pick<Env, "SEARCH_CLASSIFIER">>,
): Classifier | null => (env.SEARCH_CLASSIFIER === "scenario" ? scenarioClassifier : null);
