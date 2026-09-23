import "dotenv/config";
import { pool } from "@/db/client";
import { seedBananaScenario } from "@/db/seed";
import { embed, loadEmbeddingModel, normalizeForEmbedding } from "@/modules/embeddings";
import { BANANA_QUERY } from "@/modules/products/fixtures/banana-scenario";
import { productsRepository } from "@/modules/products/repository";

const query = process.argv[2] ?? BANANA_QUERY;

await loadEmbeddingModel();
await seedBananaScenario();
const vector = await embed(normalizeForEmbedding(query));
// threshold -1 lists every row; the table is sorted by similarity here, not by price.
const rows = await productsRepository.search(vector, { threshold: -1, limit: 100 });
rows.sort((a, b) => b.similarity - a.similarity);

console.log(`| similarity | shop | name | final price |`);
console.log(`|---|---|---|---|`);
for (const r of rows) {
  console.log(
    `| ${r.similarity.toFixed(4)} | ${r.shopName} | ${r.name} | ${(r.finalPrice / 100).toFixed(2)} |`,
  );
}
await pool.end();
