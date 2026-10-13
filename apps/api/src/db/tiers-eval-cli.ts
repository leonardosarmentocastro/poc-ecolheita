import "dotenv/config";
import { pool } from "@/db/client";
import { seedMarketplaceCorpus } from "@/db/seed";
import { env } from "@/config/env";
import { loadEmbeddingModel, normalizeForEmbedding } from "@/modules/embeddings";
import {
  ClassifierError,
  createJevClassifier,
  distinctCandidates,
  findExampleCollisions,
  findUnlabelled,
  PROTECTED_NAMES,
  TIER_CRITERIA,
  type Candidate,
  type Tier,
} from "@/modules/relevance";
import {
  gradeCorpus,
  RUNS,
  type Answers,
  type CorpusEvalRow,
} from "@/modules/relevance/grade-corpus";
import { renderCorpusReport } from "@/modules/relevance/print-corpus-grade";
import {
  CORPUS_LABELS,
  CORPUS_PAGES,
  type CorpusTerm,
} from "@/modules/products/fixtures/marketplace-corpus";
import { productsRepository } from "@/modules/products/repository";

// Grades real Jev on the marketplace corpus (spec § The eval). REPLACES the products in
// DATABASE_URL with the corpus. Exit: 0 PASS · 1 FAIL · 2 INVALID · 3 CHECK FAILED (a crash too).
// --show-holdout prints the hold-out row tables; the tuning loop never passes it.
const showHoldout = process.argv.includes("--show-holdout");
const checkFailed = (why: string): never => {
  console.log(`CHECK FAILED — ${why}`);
  process.exit(3);
};

// A crash (database, model load, shortlist) is CHECK FAILED too, never exit 1: spec § The gate,
// "a fourth outcome, neither a verdict nor a round".
try {
  if (!env.TYPESAFE_API_KEY) checkFailed("tiers:eval needs TYPESAFE_API_KEY in apps/api/.env");
  const jev = createJevClassifier({ apiKey: env.TYPESAFE_API_KEY! });

  const collisions = findExampleCollisions(TIER_CRITERIA, PROTECTED_NAMES);
  if (collisions.length)
    checkFailed(
      `criteria examples reuse protected names:\n${collisions.map((c) => `  ${c.example} ⊂ ${c.name}`).join("\n")}`,
    );

  await loadEmbeddingModel();
  await seedMarketplaceCorpus();

  // One question per distinct name (CONTEXT.md § Tiered answer); distinctCandidates, not tierShortlist.
  const terms = [...new Set(CORPUS_PAGES.map((p) => p.term))] as CorpusTerm[];
  const perTerm = new Map<CorpusTerm, { candidates: Candidate[]; labels: Tier[] }>();
  const missing: string[] = [];
  for (const term of terms) {
    const shortlist = await productsRepository.shortlist(term);
    const names = shortlist.map((p) => p.name);
    missing.push(...findUnlabelled(term, names, CORPUS_LABELS).map((n) => `  ${term} | ${n}`));
    const candidates = distinctCandidates(shortlist);
    perTerm.set(term, {
      candidates,
      labels: candidates.map((c) => CORPUS_LABELS[term][normalizeForEmbedding(c.name)]),
    });
  }
  if (missing.length)
    checkFailed(`unlabelled shortlist pairs (never defaulted):\n${missing.join("\n")}`);

  const timed = async <T>(fn: () => Promise<T>): Promise<[T, number]> => {
    const t = performance.now();
    const out = await fn();
    return [out, Math.round(performance.now() - t)];
  };

  const runEval = async () => {
    const answers = new Map<CorpusTerm, Map<number, Tier | null>[]>();
    const latencies: number[] = [];
    for (let run = 0; run < RUNS; run++) {
      for (const term of terms) {
        const { candidates } = perTerm.get(term)!;
        const runs = answers.get(term) ?? [];
        try {
          const [tiers, ms] = await timed(() => jev.classify(term, candidates));
          latencies.push(ms);
          runs.push(tiers);
          console.error(`run ${run + 1} · ${term}: ${candidates.length} questions in ${ms} ms`);
        } catch (err) {
          const kind = err instanceof ClassifierError ? err.kind : "unexpected";
          console.error(`run ${run + 1} · ${term}: FAILED (${kind})`);
          runs.push(new Map(candidates.map((c) => [c.id, null])));
        }
        answers.set(term, runs);
      }
    }
    const rows: CorpusEvalRow[] = [];
    for (const term of terms) {
      const { candidates, labels } = perTerm.get(term)!;
      const runs = answers.get(term)!;
      candidates.forEach((c, i) => {
        rows.push({
          term,
          name: c.name,
          label: labels[i],
          got: runs.map((r) => r.get(c.id) ?? null) as Answers,
        });
      });
    }
    return { rows, grade: gradeCorpus(rows, latencies) };
  };

  let result = await runEval();
  if (result.grade.latencyOnly) {
    console.error("slow call only (both floors met) — re-running once, per spec § A slow call");
    result = await runEval();
    console.log(
      "> Re-run: the first attempt failed on latency alone (both floors met), so this is the second attempt's result (spec § A slow call).\n",
    );
  }
  console.log(renderCorpusReport(result.rows, result.grade, { showHoldout }));
  await pool.end();
  process.exit({ PASS: 0, FAIL: 1, INVALID: 2 }[result.grade.verdict]);
} catch (err) {
  console.error(err);
  checkFailed(
    `the eval crashed before a verdict: ${err instanceof Error ? err.message : String(err)}`,
  );
}
