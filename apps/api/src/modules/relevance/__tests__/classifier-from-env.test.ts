import { describe, expect, it } from "vitest";
import { classifierFromEnv } from "@/modules/relevance/classifier-from-env";
import { scenarioClassifier } from "@/modules/products/fixtures/scenario-classifier";

describe("classifierFromEnv", () => {
  it("is the scenario classifier for SEARCH_CLASSIFIER=scenario", () => {
    expect(classifierFromEnv({ SEARCH_CLASSIFIER: "scenario" })).toBe(scenarioClassifier);
  });
  it("is none when nothing is configured", () => {
    expect(classifierFromEnv({})).toBeNull();
  });
  it("is Jev when only the key is set", () => {
    const c = classifierFromEnv({ TYPESAFE_API_KEY: "k" });
    expect(c).not.toBeNull();
    expect(c).not.toBe(scenarioClassifier);
  });
  it("prefers the scenario classifier when both are set", () => {
    expect(classifierFromEnv({ SEARCH_CLASSIFIER: "scenario", TYPESAFE_API_KEY: "k" })).toBe(
      scenarioClassifier,
    );
  });
});
