import "dotenv/config";
import { pool } from "@/db/client";
import { seedBananaScenario } from "@/db/seed";
import { loadEmbeddingModel } from "@/modules/embeddings";

await loadEmbeddingModel();
await seedBananaScenario();
console.log("seeded the banana scenario");
await pool.end();
