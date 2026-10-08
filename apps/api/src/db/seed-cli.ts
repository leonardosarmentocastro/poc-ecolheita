import "dotenv/config";
import { pool } from "@/db/client";
import { seedSearchScenario } from "@/db/seed";
import { loadEmbeddingModel } from "@/modules/embeddings";

await loadEmbeddingModel();
await seedSearchScenario();
console.log("seeded the search scenario");
await pool.end();
