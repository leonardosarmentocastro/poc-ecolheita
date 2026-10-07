import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/config/env";

// `pool` manages a reusable set of Postgres connections, lending one out per query.
export const pool = new Pool({ connectionString: env.DATABASE_URL });
// `db` builds typed queries and delegates execution to `pool`.
export const db = drizzle(pool);
