/** Spec § Goal: what a product is, for one search. */
export type Tier = "match" | "related" | "unrelated";

export interface Candidate {
  id: number;
  /** The product name as the shop typed it (accents kept). Never the shop name. */
  name: string;
}

/** Decides each candidate's tier for a search. Resolves every candidate or rejects. */
export interface Classifier {
  classify(query: string, candidates: Candidate[]): Promise<Map<number, Tier>>;
}

export type ClassifierFailure = "timeout" | "status" | "invalid" | "unexpected";

/** Any classifier failure; the search answers untiered and logs `kind` only. */
export class ClassifierError extends Error {
  constructor(readonly kind: ClassifierFailure) {
    super(`classifier ${kind}`);
    this.name = "ClassifierError";
  }
}
