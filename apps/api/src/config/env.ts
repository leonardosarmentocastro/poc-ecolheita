import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().default(3333),
  // Which classifier tiers search results (spec § The classifier seam). `scenario` answers
  // from the test fixture and is for e2e only; unset means none.
  SEARCH_CLASSIFIER: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.enum(["scenario"]).optional(),
  ),
  // TypeSafe Jev's key (spec § The classifier seam). Lives only in apps/api/.env; never logged.
  TYPESAFE_API_KEY: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(1).optional()),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
