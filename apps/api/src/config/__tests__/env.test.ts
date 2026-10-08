import { describe, expect, it } from "vitest";
import { envSchema } from "@/config/env";

const base = { DATABASE_URL: "postgres://ecolheita:ecolheita@localhost:5432/ecolheita_test" };

describe("envSchema", () => {
  it("defaults the port", () => {
    expect(envSchema.parse(base).PORT).toBe(3333);
  });
  it("ignores a leftover SEARCH_SIMILARITY_THRESHOLD", () => {
    expect(envSchema.parse({ ...base, SEARCH_SIMILARITY_THRESHOLD: "0.5" })).not.toHaveProperty(
      "SEARCH_SIMILARITY_THRESHOLD",
    );
  });
});

describe("SEARCH_CLASSIFIER", () => {
  it("accepts scenario and treats empty as unset", () => {
    expect(envSchema.parse({ ...base, SEARCH_CLASSIFIER: "scenario" }).SEARCH_CLASSIFIER).toBe(
      "scenario",
    );
    expect(envSchema.parse({ ...base, SEARCH_CLASSIFIER: "" }).SEARCH_CLASSIFIER).toBeUndefined();
  });
  it("refuses any other value so the boot fails", () => {
    expect(() => envSchema.parse({ ...base, SEARCH_CLASSIFIER: "jev" })).toThrow();
  });
});
