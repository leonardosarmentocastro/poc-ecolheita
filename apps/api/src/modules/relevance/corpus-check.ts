import { normalizeForEmbedding } from "@/modules/embeddings";
import type { TIER_CRITERIA } from "@/modules/relevance/criteria";
import type { Candidate, Tier } from "@/modules/relevance/types";
import { CORPUS, type CorpusTerm } from "@/modules/products/fixtures/marketplace-corpus";
import { SEARCH_SCENARIO } from "@/modules/products/fixtures/search-scenario";

/** Every name the prompt's examples must stay clear of (spec § The tuning loop). */
export const PROTECTED_NAMES: readonly string[] = [
  ...CORPUS.map((r) => r.name),
  ...SEARCH_SCENARIO.map((r) => r.name),
];

const EXAMPLE_SHAPE = /^"(.+)" for ".+"$/;

/** The quoted product of an example written as `"<product>" for "<search>"`. */
export const exampleProduct = (example: string): string => {
  const m = EXAMPLE_SHAPE.exec(example);
  if (!m)
    throw new Error(`criteria example is not in the shape "<product>" for "<search>": ${example}`);
  return m[1];
};

/**
 * Examples whose product, normalised, equals or sits inside a protected name, normalised.
 * Containment matters: listing titles are long ("Pão Francês Modelado Congelado - 260 g").
 */
export const findExampleCollisions = (
  criteria: typeof TIER_CRITERIA,
  names: readonly string[],
): { example: string; name: string }[] => {
  const hits: { example: string; name: string }[] = [];
  const normalised = names.map((n) => [n, normalizeForEmbedding(n)] as const);
  for (const { examples } of Object.values(criteria)) {
    for (const example of examples) {
      const product = normalizeForEmbedding(exampleProduct(example));
      for (const [name, key] of normalised) if (key.includes(product)) hits.push({ example, name });
    }
  }
  return hits;
};

/**
 * One question per distinct name (CONTEXT.md § Tiered answer), grouped by the eval itself:
 * `tierShortlist` also groups, but drops unrelated, and the eval needs all three tiers.
 */
export const distinctCandidates = (
  products: readonly { id: number; name: string }[],
): Candidate[] => {
  const seen = new Map<string, Candidate>();
  for (const p of products) {
    const key = normalizeForEmbedding(p.name);
    if (!seen.has(key)) seen.set(key, { id: p.id, name: p.name });
  }
  return [...seen.values()];
};

/** Shortlist names with no label for the term; one per normalised name, original spelling. */
export const findUnlabelled = (
  term: CorpusTerm,
  names: readonly string[],
  labels: Record<CorpusTerm, Record<string, Tier>>,
): string[] => {
  const seen = new Set<string>();
  const missing: string[] = [];
  for (const name of names) {
    const key = normalizeForEmbedding(name);
    if (seen.has(key)) continue;
    seen.add(key);
    if (!Object.hasOwn(labels[term], key)) missing.push(name);
  }
  return missing;
};
