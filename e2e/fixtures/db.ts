import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

export function e2eDatabaseUrl(): string {
  const url =
    process.env.E2E_DATABASE_URL ?? "postgres://ecolheita:ecolheita@localhost:5432/ecolheita_e2e";
  if (!/_e2e$/.test(new URL(url).pathname.replace(/^\//, ""))) {
    throw new Error(`refusing to use non-e2e database: ${url}`);
  }
  return url;
}

// Admin URL = same server, default `ecolheita` db, to issue CREATE DATABASE.
function adminUrl(): string {
  const u = new URL(e2eDatabaseUrl());
  u.pathname = "/ecolheita";
  return u.toString();
}

export async function provisionAndMigrate(): Promise<void> {
  const dbName = new URL(e2eDatabaseUrl()).pathname.replace(/^\//, "");
  const admin = new Pool({ connectionString: adminUrl() });
  try {
    const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (exists.rowCount === 0) await admin.query(`CREATE DATABASE "${dbName}"`);
  } catch (err) {
    throw new Error(
      `could not provision ${dbName}. Is Postgres running? Try \`pnpm db:up\`. Cause: ${(err as Error).message}`,
    );
  } finally {
    await admin.end();
  }
  const pool = new Pool({ connectionString: e2eDatabaseUrl() });
  await migrate(drizzle(pool), { migrationsFolder: "apps/api/drizzle" });
  await pool.end();
}

let pool: Pool | undefined;
function testPool(): Pool {
  return (pool ??= new Pool({ connectionString: e2eDatabaseUrl() }));
}

export async function truncateAll(): Promise<void> {
  await testPool().query("TRUNCATE TABLE products RESTART IDENTITY CASCADE");
}

export async function resetPool(): Promise<void> {
  await pool?.end();
  pool = undefined;
}
