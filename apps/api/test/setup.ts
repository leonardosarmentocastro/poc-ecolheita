import { afterAll, beforeEach } from "vitest";
import { pool } from "@/db/client";

beforeEach(async () => {
  await pool.query("TRUNCATE TABLE products RESTART IDENTITY CASCADE");
});

afterAll(async () => {
  await pool.end();
});
