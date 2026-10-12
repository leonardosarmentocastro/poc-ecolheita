import "dotenv/config";
import { pool } from "@/db/client";
import { seedSearchScenario } from "@/db/seed";
import { env } from "@/config/env";
import { loadEmbeddingModel } from "@/modules/embeddings";
import { createJevClassifier, ClassifierError, type Tier } from "@/modules/relevance";
import { gradeTiers, type EvalRow } from "@/modules/relevance/evaluate-tiers";
import { FILLER_NAMES } from "@/modules/products/fixtures/filler-names";
import {
  EXPECTED_TIERS,
  SEARCH_SCENARIO,
  type ScenarioQuery,
} from "@/modules/products/fixtures/search-scenario";
import { productsRepository } from "@/modules/products/repository";

// Grades real Jev on the search scenario (spec § Testing, tiers:eval). REPLACES the products
// in DATABASE_URL with the scenario. Paste the printed table into the slice's PR body.
if (!env.TYPESAFE_API_KEY) {
  console.error("tiers:eval needs TYPESAFE_API_KEY in apps/api/.env");
  process.exit(1);
}
const jev = createJevClassifier({ apiKey: env.TYPESAFE_API_KEY });

const expectedTier = (q: ScenarioQuery, name: string): Tier => {
  const key = SEARCH_SCENARIO.find((r) => r.name === name)?.key;
  if (key && EXPECTED_TIERS[q].matches.includes(key)) return "match";
  if (key && EXPECTED_TIERS[q].related.includes(key)) return "related";
  return "unrelated";
};

const timed = async <T>(fn: () => Promise<T>): Promise<[T, number]> => {
  const t = performance.now();
  const out = await fn();
  return [out, Math.round(performance.now() - t)];
};

await loadEmbeddingModel();
await seedSearchScenario();

const rows: EvalRow[] = [];
const latencies: number[] = [];
let timedOut = false;
console.log("| query | product | expected | Jev | ✓ |\n|---|---|---|---|---|"); // no confidence column: the adapter does not return it (spec § Jev implementation)
for (const q of Object.keys(EXPECTED_TIERS) as ScenarioQuery[]) {
  const shortlist = await productsRepository.shortlist(q);
  try {
    const [tiers, ms] = await timed(() =>
      jev.classify(
        q,
        shortlist.map((p) => ({ id: p.id, name: p.name })),
      ),
    );
    latencies.push(ms);
    for (const p of shortlist) {
      const row = { name: p.name, expected: expectedTier(q, p.name), got: tiers.get(p.id)! };
      rows.push(row);
      console.log(
        `| ${q} | ${p.name} | ${row.expected} | ${row.got} | ${row.expected === row.got ? "✓" : "✗"} |`,
      );
    }
    console.log(`\n${q}: ${shortlist.length} candidates in ${ms} ms\n`);
  } catch (err) {
    timedOut ||= err instanceof ClassifierError && err.kind === "timeout";
    console.log(`\n${q}: FAILED (${err instanceof ClassifierError ? err.kind : "unexpected"})\n`);
    rows.push({ name: `(${q} call)`, expected: "match", got: "unrelated" });
  }
}

const fifty = [
  ...SEARCH_SCENARIO.map((r, i) => ({ id: i + 1, name: r.name })),
  ...FILLER_NAMES.slice(0, 36).map((name, i) => ({ id: 100 + i, name })),
];
for (let run = 1; run <= 5; run++) {
  try {
    const [, ms] = await timed(() => jev.classify("bolo", fifty));
    latencies.push(ms);
    console.log(`50 candidates, run ${run}: ${ms} ms`);
  } catch (err) {
    timedOut ||= err instanceof ClassifierError && err.kind === "timeout";
    console.log(
      `50 candidates, run ${run}: FAILED (${err instanceof ClassifierError ? err.kind : "unexpected"})`,
    );
    latencies.push(Number.POSITIVE_INFINITY);
  }
}

const grade = gradeTiers(rows, latencies);
console.log(
  `\nagreement ${grade.agree}/${grade.total} · worst latency ${grade.worstMs} ms (budget 1500) · model jev-1.13.0`,
);
console.log(
  grade.pass && !timedOut ? "PASS" : "FAIL — report to the human; never bend the fixture",
);
await pool.end();
process.exit(grade.pass && !timedOut ? 0 : 1);
