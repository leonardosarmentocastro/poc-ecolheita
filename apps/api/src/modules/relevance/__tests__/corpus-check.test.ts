import { describe, expect, it } from "vitest";
import {
  distinctCandidates,
  exampleProduct,
  findExampleCollisions,
  findUnlabelled,
  PROTECTED_NAMES,
} from "@/modules/relevance/corpus-check";
import { TIER_CRITERIA } from "@/modules/relevance/criteria";
import { CORPUS, CORPUS_LABELS } from "@/modules/products/fixtures/marketplace-corpus";
import { SEARCH_SCENARIO } from "@/modules/products/fixtures/search-scenario";

const criteriaWith = (examples: string[]) => ({
  match: { what: "", examples },
  related: { what: "", examples: [] },
  unrelated: { what: "", examples: [] },
});

describe("exampleProduct", () => {
  it("reads the quoted product of an example", () => {
    expect(exampleProduct('"Laranja pera" for "laranja"')).toBe("Laranja pera");
  });
  it("rejects an example in another shape", () => {
    expect(() => exampleProduct("Laranja pera")).toThrow(/shape/);
  });
});

describe("findExampleCollisions", () => {
  it("catches containment after normalisation, not only equality", () => {
    const hits = findExampleCollisions(criteriaWith(['"Pão francês" for "pão"']), [
      "Pão Francês Modelado Congelado - 260 g",
      "Banana prata",
    ]);
    expect(hits).toEqual([
      { example: '"Pão francês" for "pão"', name: "Pão Francês Modelado Congelado - 260 g" },
    ]);
  });
  it("keeps accents: 'maca' does not collide with 'Maçã'", () => {
    expect(findExampleCollisions(criteriaWith(['"Maca" for "maca"']), ["Maçã argentina"])).toEqual(
      [],
    );
  });
  it("the current criteria collide with nothing in the corpus or the scenario", () => {
    expect(findExampleCollisions(TIER_CRITERIA, PROTECTED_NAMES)).toEqual([]);
  });
  it("PROTECTED_NAMES holds every corpus and scenario name", () => {
    expect(PROTECTED_NAMES).toHaveLength(CORPUS.length + SEARCH_SCENARIO.length);
    expect(PROTECTED_NAMES).toContain(CORPUS[0].name);
    expect(PROTECTED_NAMES).toContain("Bananada"); // a scenario name
  });
});

describe("findUnlabelled", () => {
  it("lists shortlist names without a label for the term, once per normalised name", () => {
    const labels = { ...CORPUS_LABELS, uva: { "uva crimson": "match" as const } };
    expect(
      findUnlabelled("uva", ["Uva Crimson", "UVA  crimson", "Kapo Uva 200ml"], labels),
    ).toEqual(["Kapo Uva 200ml"]);
  });

  it("does not count a name as labelled because it matches an inherited object key", () => {
    const labels = { ...CORPUS_LABELS, uva: { "uva crimson": "match" as const } };
    expect(findUnlabelled("uva", ["Constructor", "toString"], labels)).toEqual([
      "Constructor",
      "toString",
    ]);
  });
});

describe("distinctCandidates", () => {
  it("asks once per normalised name, keeping the first id and spelling, in order", () => {
    expect(
      distinctCandidates([
        { id: 7, name: "Uva Crimson" },
        { id: 9, name: "UVA  crimson" },
        { id: 3, name: "Kapo Uva 200ml" },
        { id: 11, name: "uva crimson " },
      ]),
    ).toEqual([
      { id: 7, name: "Uva Crimson" },
      { id: 3, name: "Kapo Uva 200ml" },
    ]);
  });
  it("keeps accents apart: Maca and Maçã are two questions", () => {
    expect(
      distinctCandidates([
        { id: 1, name: "Maca" },
        { id: 2, name: "Maçã" },
      ]),
    ).toHaveLength(2);
  });
});
