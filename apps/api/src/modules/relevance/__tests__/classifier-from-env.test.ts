import { afterEach, describe, expect, it, vi } from "vitest";
import { classifierFromEnv } from "@/modules/relevance/classifier-from-env";
import { scenarioClassifier } from "@/modules/products/fixtures/scenario-classifier";
import { JEV_URL } from "@/modules/relevance/jev-classifier";

afterEach(() => vi.unstubAllGlobals());

describe("classifierFromEnv", () => {
  it("is the scenario classifier for SEARCH_CLASSIFIER=scenario", () => {
    expect(classifierFromEnv({ SEARCH_CLASSIFIER: "scenario" })).toBe(scenarioClassifier);
  });
  it("is none when nothing is configured", () => {
    expect(classifierFromEnv({})).toBeNull();
  });
  it("is Jev when only the key is set", async () => {
    const fetch = vi.fn(async () => Response.json({ answers: { q1: { choice: "match" } } }));
    vi.stubGlobal("fetch", fetch);
    const c = classifierFromEnv({ TYPESAFE_API_KEY: "k" });
    await expect(c?.classify("banana", [{ id: 1, name: "Banana" }])).resolves.toEqual(
      new Map([[1, "match"]]),
    );
    expect(fetch).toHaveBeenCalledWith(
      JEV_URL,
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: "Bearer k" }),
      }),
    );
  });
  it("prefers the scenario classifier when both are set", () => {
    expect(classifierFromEnv({ SEARCH_CLASSIFIER: "scenario", TYPESAFE_API_KEY: "k" })).toBe(
      scenarioClassifier,
    );
  });
});
