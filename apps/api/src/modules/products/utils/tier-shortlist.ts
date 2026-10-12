import { normalizeForEmbedding } from "@/modules/embeddings";
import { ClassifierError, type Candidate, type Classifier, type Tier } from "@/modules/relevance";
import type { Product } from "@/modules/products/types";

const byPriceThenId = (a: Product, b: Product) => a.finalPrice - b.finalPrice || a.id - b.id;

/**
 * Spec § The flow, steps 3–4: one question per distinct name (accents kept), the tier spread
 * to every offer of that name, unrelated dropped, each tier cheapest first.
 */
export const tierShortlist = async (
  query: string,
  shortlist: Product[],
  classifier: Classifier,
): Promise<{ matches: Product[]; related: Product[] }> => {
  const representative = new Map<string, Candidate>();
  for (const p of shortlist) {
    const key = normalizeForEmbedding(p.name);
    if (!representative.has(key)) representative.set(key, { id: p.id, name: p.name });
  }

  let answers: Map<number, Tier>;
  try {
    answers = await classifier.classify(query, [...representative.values()]);
  } catch (err) {
    throw err instanceof ClassifierError ? err : new ClassifierError("unexpected");
  }

  const matches: Product[] = [];
  const related: Product[] = [];
  for (const p of shortlist) {
    const tier = answers.get(representative.get(normalizeForEmbedding(p.name))!.id);
    if (tier === undefined) throw new ClassifierError("invalid");
    if (tier === "match") matches.push(p);
    else if (tier === "related") related.push(p);
  }
  return { matches: matches.sort(byPriceThenId), related: related.sort(byPriceThenId) };
};
