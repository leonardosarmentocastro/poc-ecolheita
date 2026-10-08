import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().default(3333),
  // Which classifier tiers search results (spec § The classifier seam). `scenario` answers
  // from the test fixture and is for e2e only; unset means none. Slice 3 adds Jev.
  SEARCH_CLASSIFIER: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.enum(["scenario"]).optional(),
  ),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
