import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().default(3333),
  // Cosine similarity floor for a search match (CONTEXT.md). Default chosen from the
  // banana scenario's similarity table — see the slice 2 pull request. An empty value
  // (`SEARCH_SIMILARITY_THRESHOLD=` in a .env) is unset, never 0.
  SEARCH_SIMILARITY_THRESHOLD: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.coerce.number().min(-1).max(1).default(0.6),
  ),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
