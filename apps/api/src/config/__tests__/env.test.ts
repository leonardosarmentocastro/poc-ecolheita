import { describe, expect, it } from "vitest";
import { envSchema } from "@/config/env";

const base = { DATABASE_URL: "postgres://ecolheita:ecolheita@localhost:5432/ecolheita_test" };

describe("envSchema", () => {
  it("defaults the threshold to a float inside [-1, 1]", () => {
    const parsed = envSchema.parse(base);
    expect(parsed.SEARCH_SIMILARITY_THRESHOLD).toBeGreaterThanOrEqual(-1);
    expect(parsed.SEARCH_SIMILARITY_THRESHOLD).toBeLessThanOrEqual(1);
  });
  it("coerces a float string", () => {
    expect(
      envSchema.parse({ ...base, SEARCH_SIMILARITY_THRESHOLD: "0.55" }).SEARCH_SIMILARITY_THRESHOLD,
    ).toBe(0.55);
  });
  it.each(["abc", "1.5", "-2"])("refuses %s so the boot fails", (value) => {
    expect(() => envSchema.parse({ ...base, SEARCH_SIMILARITY_THRESHOLD: value })).toThrow();
  });
  it("treats an empty value as unset (the default), never as 0", () => {
    const parsed = envSchema.parse({ ...base, SEARCH_SIMILARITY_THRESHOLD: "" });
    expect(parsed.SEARCH_SIMILARITY_THRESHOLD).toBe(
      envSchema.parse(base).SEARCH_SIMILARITY_THRESHOLD,
    );
  });
});
