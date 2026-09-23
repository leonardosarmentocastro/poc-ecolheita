/** The one normalisation every embedded text goes through (CONTEXT.md). */
export const normalizeForEmbedding = (text: string): string =>
  text.trim().toLowerCase().replace(/\s+/g, " ");
