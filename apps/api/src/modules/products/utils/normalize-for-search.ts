import { normalizeForEmbedding } from "@/modules/embeddings";

/**
 * The fuzzy list's normalisation (CONTEXT.md § Search): the embedding normalisation plus
 * accent stripping. It decides who is considered, never what something is — the vector
 * and the classifier keep the accents.
 */
export const normalizeForSearch = (text: string): string =>
  normalizeForEmbedding(text).normalize("NFD").replace(/\p{M}/gu, "");
