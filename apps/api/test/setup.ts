import { afterAll, beforeAll, beforeEach } from "vitest";
import { pool } from "@/db/client";
import { loadEmbeddingModel } from "@/modules/embeddings";

beforeAll(async () => {
  await loadEmbeddingModel();
});

beforeEach(async () => {
  await pool.query("TRUNCATE TABLE products RESTART IDENTITY CASCADE");
});

afterAll(async () => {
  await pool.end();
});
