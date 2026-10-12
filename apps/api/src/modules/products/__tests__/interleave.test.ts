import { describe, expect, it } from "vitest";
import { interleave } from "@/modules/products/utils/interleave";

describe("interleave", () => {
  it("alternates the two lists, first list first", () => {
    expect(interleave([1, 2, 3], [4, 5, 6], 10)).toEqual([1, 4, 2, 5, 3, 6]);
  });
  it("skips an id the other list already gave", () => {
    expect(interleave([1, 2, 3], [2, 1, 4], 10)).toEqual([1, 2, 3, 4]);
  });
  it("stops at size", () => {
    expect(interleave([1, 2, 3], [4, 5, 6], 3)).toEqual([1, 4, 2]);
  });
  it("keeps going on the longer list when one runs out", () => {
    expect(interleave([1], [4, 5, 6], 10)).toEqual([1, 4, 5, 6]);
    expect(interleave([], [], 10)).toEqual([]);
  });
});
