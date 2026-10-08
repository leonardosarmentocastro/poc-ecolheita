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
