# Marketplace calibration — design

**Feature key:** `marketplace-calibration` · **Branch:** `feat/marketplace-calibration`
**Reviewed:** round 1 (2026-10-12) · round 2 (2026-10-12).
**Related issues:** [#10 self-hosted backup for Jev (spike)](https://github.com/leonardosarmentocastro/poc-ecolheita/issues/10) · the open decision recorded in [PR #14 (slice 3, "Real-Jev check")](https://github.com/leonardosarmentocastro/poc-ecolheita/pull/14)

## Goal

Measure the relevance classifier (TypeSafe Jev) against what two real marketplaces answer
for the same searches, instead of against fourteen names we invented, and tune the
instructions we send it until it agrees with them at least 80% of the time, run after run.

The search-relevance-tiers feature shipped with a known gap. Its real-Jev check
(`tiers:eval`) graded Jev on 28 rows (14 products × the searches "banana" and "bolo") and
required every row right. Four runs of identical input got 24 to 26 right, and **the rows
Jev got wrong changed from run to run**. Rewording was stopped because 28 rows cannot tell
a better prompt from noise. PR #14 left the decision open: accept the risk, change the gate,
or try another approach.

This feature does three things:

1. **A real corpus.** Capture, once, the first page of results for six grocery searches on
   Mercado Livre and on Amazon Now (Amazon's grocery delivery in São Paulo), and store the
   product names as a fixture. About 240 names.
2. **A gate that measures both problems.** Run the eval three times over the corpus and
   report two numbers: how often Jev agrees with the approved labels (accuracy) and how often
   it gives a row the same answer in all three runs (stability). Both must reach 80%.
3. **A bounded tuning loop.** Let an agent edit only the instructions sent to Jev, tune on
   four of the six terms, and prove the result on the two it never saw.

The marketplaces are the referee. Mercado Livre is broad (anyone sells anything there), so
its first page says what people consider **relevant** to a search. Amazon Now is curated
(Amazon decides what the grocery catalogue holds), and its first page for "uva" lists fresh
grapes before raisins before grape juice, so it informs the **match vs related** line. Neither
site labels anything; the labels are proposed from the tier rule in `CONTEXT.md` and approved
by a human, one by one, before any tuning starts.

### Success criterion

`pnpm --filter api tiers:eval` runs the whole search (shortlist then Jev) over the corpus
three times and prints, for the tuning terms and for the hold-out terms separately, the
agreement of each run and the stability across runs. It passes when, on the hold-out terms,
every run agrees with the labels on at least 80% of rows and at least 80% of rows keep the
same tier across the three runs, no Jev call failed and the slowest call stayed within
1500 ms. The fixture, the labels, the grader, the printed tables and the round-0 prompt
(today's wording, with any corpus-colliding example replaced; see *The tuning loop*) merge
whether or not the gate passes; a tuning edit (round 1 or later) merges only if the gate
passes.

## Non-goals

- A scraper the repository keeps. The capture runs once; the script is throwaway.
- Re-capturing on a schedule or on each eval. The corpus is a dated snapshot.
- Shop-chosen product categories ("banana" as fruit vs as a toy). A future feature.
- Majority-of-three calls in production, caching Jev answers, or any change to the search
  flow, the shortlist, the API contract or the page. This feature changes the eval and, at
  most, the prompt: the criteria wording in `criteria.ts`, and the `state` line and the
  per-question `instructions` in `jev-classifier.ts`.
- A different model version. `jev-1.13.0` stays pinned; an upgrade is a separate decision.
- A backup classifier (#10). The numbers this feature produces are the input to that decision.
- Swift or any third source. Two sites, six terms.
- Changing the three-tier rule in `CONTEXT.md`. If the corpus shows the rule is wrong, that is
  a finding for the human, recorded in the PR, not a change this feature makes.

## The sources

| site | URL shape | what its first page proves |
|---|---|---|
| Mercado Livre | `https://lista.mercadolivre.com.br/<term>` | every listed product is **relevant** (match or related) to the term. It does not sell fresh produce, so for "banana" it lists banana passa, chips and candy: a hard test of the related side. |
| Amazon Now | `https://www.amazon.com.br/s?k=<term>&i=amazonnow` | every listed product is relevant, and the page mixes fresh items with derived ones, so it is where match and related meet. |

Amazon Now answers to a headless browser without a captcha (verified 2026-10-12: 15 names
for "banana" in one request). Mercado Livre sends any automated browser, headless or
visible, Chromium or Google Chrome, to a login wall ("Para continuar, acesse sua conta");
its public search API answers 403 without an app token. The capture therefore uses a
persistent browser profile that the human logs into once (see *The capture*).

## The terms

| term | role | why it is in |
|---|---|---|
| banana | tuning | already in the scenario; Mercado Livre has zero fresh bananas, so it stresses the related side |
| pão | tuning | many varieties (francês, de forma, integral) plus butter and jam: a variety is a match |
| frango | tuning | in natura vs nuggets, empanado, caldo: processed forms of the same thing |
| carne | tuning | a butcher's answer is many cuts (fraldinha, maminha, picanha, carne moída): all matches |
| uva | **hold-out** | fresh grapes, raisins and juice on one Amazon page: the match/related line |
| papel higiênico | **hold-out** | non-food; papel toalha and guardanapo test the unrelated boundary |

The hold-out terms are never used while tuning the prompt. The gate is measured on them.
The tuning terms are reported beside them so the human can see whether a prompt that passes
the hold-out also improved what it was tuned on.

The existing 14-row scenario (`search-scenario.ts`) is untouched. It keeps serving the API
and e2e tests with the scenario classifier. It is no longer what `tiers:eval` grades.

## The capture

A one-off step, run from this design session once the spec is approved and before the
plans are written, so the plan reviewer and the label approval see real names. Its output
(the fixture and the screenshots) is committed **on the feature branch as a design-session
artefact**, approved row by row by the human (see *The labels*); the capture script and the
labelling script are both throwaway and live in the session's scratch directory, never in
the repository. Slice 1's plan lists the fixture as a pre-existing input, so the slice
reviewer knows it is not in that slice's diff (human, spec review round 1).

Procedure, per site and term:

1. Open the search URL. Amazon Now: the delivery address is São Paulo (CEP 01319-900), set
   through the page's address dialog if the page asks for one. Mercado Livre: the browser
   profile is already logged in (below).
2. Read the result cards in page order. Skip cards marked as sponsored ("Ad" / "Patrocinado").
   Keep the first **20** organic cards, or every organic card when the page has fewer (Amazon
   Now listed 7 for "banana" on 2026-10-12).
3. For each card record: site, term, position (1-based, after skipping sponsored cards), the
   **full listing title** as the DOM holds it (not the truncated display text), the current
   price in integer cents, the listing URL.
4. Take one screenshot of the result grid per page, as evidence of what was captured.
5. Record the capture date and the search URL once per page.

**Mercado Livre login.** The script uses a Playwright persistent context whose profile
directory lives beside the script in the session's scratch directory, outside the
repository, so nothing needs a `.gitignore` entry. The first run opens a visible window
on the login wall; the human logs in; the profile keeps the session; the script continues.
If the wall still blocks a logged-in automated browser, the fallback is a session with the
Claude in Chrome extension connected, where the capture runs in the human's own browser with
the same procedure and the same output; the fixture records which route produced each page.

**What is committed.** The fixture file (below) and the screenshots, under
`apps/api/test/marketplace/<site>-<term>.png`, outside the TypeScript source tree so the
compiler and the linter never see binaries. Twelve PNGs of the result grid at a 1400-px
viewport, not full-page.

## The corpus fixture

`apps/api/src/modules/products/fixtures/marketplace-corpus.ts`, beside the search scenario
and the other fixtures (every fixture lives under `products/fixtures/` today; the relevance
module imports from there as the scenario classifier already does). One copy of the truth,
imported by the seed step of `tiers:eval` and by the labels check.

```ts
export type CorpusSite = "mercado-livre" | "amazon-now";
export type CorpusTerm = "banana" | "pão" | "frango" | "carne" | "uva" | "papel higiênico";

export interface CorpusRow {
  site: CorpusSite;
  term: CorpusTerm;        // the search that listed it
  position: number;        // 1-based, sponsored cards skipped
  name: string;            // full listing title, verbatim
  priceCents: number;      // current price; 0 when the card showed none
  url: string;             // the listing
}

export interface CorpusPage {
  site: CorpusSite;
  term: CorpusTerm;
  searchUrl: string;
  capturedAt: string;      // ISO date
  route: "playwright" | "claude-in-chrome";
}

export const TUNING_TERMS: readonly CorpusTerm[] = ["banana", "pão", "frango", "carne"];
export const HOLDOUT_TERMS: readonly CorpusTerm[] = ["uva", "papel higiênico"];
export const CORPUS_PAGES: readonly CorpusPage[];
export const CORPUS: readonly CorpusRow[];
```

**Seeding.** `tiers:eval` wipes the products table and inserts every corpus row through the
repository (the only write path, so every product gets its vector and `search_name`):
`shopName` = the site's display name ("Mercado Livre", "Amazon Now"), `name` = the listing
title, `price` = `priceCents`, `quantity` = 10, `discountPercentage` = 0. A title listed by
both sites, or by two terms, is inserted once per listing: duplicates are two offers
(`CONTEXT.md`) and share a tier because the classifier is asked once per distinct name.
`CORPUS` is ordered by (site, term, position) and inserted in that order, so ids follow the
fixture and the shortlist's tie-break on id gives the same shortlist on every machine; the
labelled pairs are therefore reproducible. A card that showed no price is stored with
`priceCents = 0`; the schema accepts it, it makes that row the cheapest in a tiered answer,
and that is harmless here because the eval grades tiers, not order. The plan does not "fix" it.

## The labels

A label is a tier for one **(term, name)** pair. The set of pairs that need a label is not
"every name for every term": it is every pair the **shortlist** produces when the corpus is
seeded and each of the six terms is searched. A "banana" search over 240 names pulls the
Amazon and Mercado Livre banana pages and whatever else the fuzzy and meaning lists find
("Bolo de banana"-like names from other pages). Those cross-page names need a label for
"banana" too.

**Proposal.** After the capture, the labelling step seeds the corpus, runs the shortlist for
each term, and writes every pair with a **proposed** tier, by the `CONTEXT.md` rule:

- a name on the term's own first page (either site) is **match** when it is the thing or a
  variety or form of it ("Banana Prata - 1 Und", "Uva Crimson", "Pão francês"), otherwise
  **related** (banana passa, chips de banana, suco de uva, uva passa, nuggets de frango);
- a first-page name is **never proposed as unrelated**: being listed is the marketplace's
  verdict that it is relevant, which is the point of the experiment;
- a cross-page name is labelled by the rule alone, which usually means **unrelated**
  ("Danoninho banana" for "pão"), sometimes related.

**Approval.** The proposals go to the human as one table per term, in the design session.
The human accepts, flips, or overrides a row. An override that labels a first-page name
unrelated (a banana costume on Mercado Livre, say) is allowed and recorded in the fixture
with a one-line reason; it is the human's judgement overruling the marketplace. Only
approved labels are committed, in the same fixture file:

```ts
/** Approved tiers per search, keyed by the normalised name (trim, lowercase, collapse spaces, accents kept). */
export const CORPUS_LABELS: Record<CorpusTerm, Record<string, Tier>>;
/** Every first-page name the human labelled unrelated, with the reason; the label itself is in CORPUS_LABELS. */
export const CORPUS_OVERRIDES: readonly { term: CorpusTerm; name: string; reason: string }[];
```

**Unlabelled pair.** If at eval time a shortlist contains a name with no label for that
term (a model or shortlist change moved the boundary), the eval **fails before any Jev call
is made or billed** and prints the missing pairs. It never defaults a pair to unrelated.
Adding the label is a human decision, through the same approval. The same check runs in
`pnpm test` as a repository-level test over the seeded corpus (HTTP cannot observe the
50-row shortlist, the untiered answer returns 20; `apps/api/AGENTS.md` allows a repository
test for what HTTP cannot see), so a drift is caught without a key.

## The eval

`pnpm --filter api tiers:eval` is rewritten. It needs `TYPESAFE_API_KEY` in `apps/api/.env`
(a worktree does not carry the main checkout's `.env`; copy it) and a running Postgres on
`DATABASE_URL`, whose products it **replaces**, as today.

```
1. seed       wipe products, insert the corpus through the repository
2. check      for each term: shortlist(term); every (term, name) has a label, else FAIL and list them
3. run ×3     for each term: shortlist(term) → one Jev call (one question per distinct name) → tiers
              a failed call (timeout, status, invalid) makes the whole eval INVALID; no retries
4. grade      per term group (tuning / hold-out):
                agreement[run] = rows where Jev's tier == label  ÷ rows,  for run 1, 2, 3
                stability      = rows with the same tier in all three runs ÷ rows
                per label class (match / related / unrelated): rows and agreement[run]
              latency: worst of the 18 calls, budget 1500 ms (unchanged)
5. print      tuning terms: one table per term with every row (label, run 1, run 2, run 3, stable?)
              both groups: the summary table (pooled and per label class), the latency line
              the verdict: PASS, FAIL or INVALID
              hold-out row tables ONLY with --show-holdout (see The tuning loop)
```

A **row** is one (term, distinct name) pair in that term's shortlist. Two offers with the
same name are one row, as they are one question.

**A failed call.** A timeout, an error status or a malformed answer on **any** term, tuning
or hold-out, makes the eval **INVALID**: no PASS or FAIL is printed, the tables are still
printed with "—" in that run's column for the affected term, and the exit code is 2.
An INVALID eval is simply re-run; it is not a round of the tuning loop and does not count
toward the stop rules. With 18 calls per eval against a 1500 ms budget, one transient failure
per eval is plausible, and a transient failure must not be read as a worse prompt. A round
that goes INVALID three times in a row stops the loop and is reported to the human: the cost
of re-runs (18 calls each, a fraction of a cent) is accepted, an unreachable Jev is not.

**A slow call.** A round whose hold-out meets both 80% figures but whose slowest call
exceeded 1500 ms (the adapter's own timeout is 2000 ms, so the call did succeed) is
**re-run once**, like INVALID; it is FAIL only if the second run misses the budget too.
Latency is Jev's, not the prompt's, and a single slow call must not be read as a worse prompt.

### The gate

```
INVALID  ⇔  any Jev call failed                                 (exit 2)
PASS     ⇔  not INVALID
            and on the hold-out terms:
              agreement[1] ≥ 0.80 and agreement[2] ≥ 0.80 and agreement[3] ≥ 0.80
              and stability ≥ 0.80
            and worst latency ≤ 1500 ms                          (exit 0)
FAIL     ⇔  otherwise                                            (exit 1)
```

The gate is **pooled** over the hold-out rows, and roughly half of a hold-out shortlist is
cross-page names whose label is usually unrelated, the easy class. The per-class line in the
summary exists so the human and the PR can see what the 80% is made of: a PASS whose match
and related classes score far below the pooled number is a PASS the human reads before
accepting the prompt (see *Accepted risks*).

The tuning terms are printed with the same numbers but do not decide PASS. The grader is a
pure function (`gradeTiers` is replaced by a `gradeCorpus` that takes the rows with three
answers each and the group split) and is unit-tested. The 80% figures are constants in the
grader, not flags: changing the bar is a design change.

The latency check keeps today's shape: the worst of all Jev calls in the run. The previous
five-fold "50 candidates" timing loop is dropped, because a corpus search already sends up to
50 questions per call.

## The tuning loop

Runs in the implementation session, as tasks of the second slice, by the implementer. One
round is:

```
1. edit     only the prompt: TIER_CRITERIA (what / not_for / examples) in criteria.ts,
            the `state` line and the per-question `instructions` in jev-classifier.ts
2. eval     pnpm --filter api tiers:eval          (never with --show-holdout)
3. commit   the wording plus the printed tables, as one commit per round
4. decide   stop when the eval's verdict is PASS;
            stop when the round did not improve the tuning mean over the best previous round;
            stop after round 5 regardless
```

"The hold-out passes" means the gate's PASS, slow-call re-run included, nothing weaker.

**Tuning mean** = (agreement[1] + agreement[2] + agreement[3]) ÷ 3 over the tuning group's
rows. A round **improves** only if its tuning mean beats the best previous round's by more
than one row's worth (1 ÷ the tuning group's row count): a gain within the run-to-run noise
is not an improvement, so the loop does not stop on noise and does not continue on it either.

Rules the loop may not break:

- **Labels, model, shortlist, the 80% bar and the gate are frozen.** The loop grades against
  the labels; it never edits them. A label the loop believes is wrong is reported to the
  human, not changed.
- **Examples in the prompt never reuse a corpus name**, in any term. The existing rule for the
  scenario extends to the corpus. Every example has the shape `"<product>" for "<search>"`;
  the check takes the quoted product, normalises it (trim, lowercase, collapse spaces,
  accents kept) and fails the eval, before any Jev call, if it **equals or is contained in**
  any corpus name, in any term. Containment matters because listing titles are long
  ("Pão Francês Wickbold 500 g" contains today's example "Pão francês"). Collisions are
  near-certain: `"Pão francês" for "pão"` and `"Manteiga com sal" for "pão"` are examples
  today and the pão page lists varieties and butter. Replacing the colliding examples is
  therefore **slice 1's work**, the edit that makes the eval runnable at all; it is recorded
  in the round table as round 0's only edit, it merges with the measurement whether or not
  the gate ever passes, and "round 0" and "the prompt of round 0" mean that wording
  everywhere in this spec. This check replaces the existing adapter test "keeps the
  scenario's names out of the criteria examples": the new check covers the scenario's names
  and the corpus's, normalised, by equality or containment.
- **The hold-out is unseen by the tool, not by promise.** `tiers:eval` prints the hold-out
  terms only as summaries (pooled and per class). Their row tables appear only with
  `--show-holdout`, which the loop never passes; the implementer runs the final round once
  with it, for the PR body, after the loop has stopped. A reviewer can check the commits:
  no round's committed output contains a hold-out row table.
- Round 0 is slice 1's wording and slice 1's numbers. Slice 2 **reuses** them as its baseline
  for the stop rule and does not re-run round 0, so the baseline is one noisy sample, not two.

## Outcome

Whatever the loop reaches, the second slice's PR carries the round table: round, what was
reworded, tuning mean agreement, hold-out agreement per run, hold-out stability.

- **Hold-out passes:** the prompt of the passing round ships. `CONTEXT.md` keeps saying that
  changing the wording means re-running `tiers:eval`; that sentence stays true.
- **Hold-out never passes:** the prompt of round 0 ships (slice 1's wording, no tuning edit).
  The PR records the best round and reopens PR #14's decision with real numbers: accept the
  risk, majority-of-three in production, or #10. The corpus, the labels, the grader and the
  eval merge regardless, because the measurement is useful on its own.

## Testing

What the TDD mandate covers here, by tier (`AGENTS.md`):

- **Grader** (`gradeCorpus`): unit tests beside it. Cases: exact 80% passes and 79% fails on
  agreement and on stability; a tuning-group number below 80% does not fail the gate; a
  failed call makes the result INVALID, not FAIL; a latency over budget fails; the per-class
  numbers are computed for each class present.
- **Labels check**: unit test that an example whose quoted product equals, or is contained
  in, a corpus or scenario name after normalisation is rejected, and that a shortlist name
  without a label is listed by term.
- **Corpus seeding**: an HTTP test that, with the corpus seeded and no classifier configured,
  `GET /products/search?q=uva` answers untiered with exactly 20 results, at least one with
  `shopName` "Amazon Now" and one with "Mercado Livre", and every one of them a corpus row
  (no scenario product survives the wipe). This proves the fixture goes through the one write
  path and reaches the shortlist; it does not call Jev. A second, repository-level test over
  the same seed asserts that every (term, name) pair in each term's 50-row shortlist has a
  label, the drift check.
- **The eval itself and the capture script** are scripts whose correctness a human sees by
  running them, like `seed-cli.ts` today. The eval's pure parts (grading, label check, price
  parsing if any survives into the repo) are the tested parts.
- **Real Jev** is exercised only by `tiers:eval`, never by the test suite (unchanged).

### Existing tests

`evaluate-tiers.test.ts` is replaced by the grader's new tests. `filler-names.ts` and its
test go with it: its only users were the old eval's 50-candidate timing loop and that test,
and a corpus search already sends up to 50 questions per call. Nothing else changes: the
scenario, the scenario classifier, the API and e2e search tests are untouched.

## Accepted risks

- **The snapshot ages.** Both sites change daily. The fixture records the date and the URLs;
  the finding is about Jev's behaviour on realistic names, not about today's ranking.
- **Marketplace relevance is not street-market relevance.** Mercado Livre lists a banana
  costume as relevant to "banana"; the human override exists for that and is recorded.
- **Two hold-out terms are a small sample** (roughly 40 to 60 rows). 80% on them is a coarse
  signal. The alternative, more terms, costs more labels to approve; six was the agreed size.
- **The login wall may hold even for a logged-in profile.** The fallback route (Claude in
  Chrome) is manual-assisted and slower, but produces the same fixture.
- **Jev's nondeterminism is measured, not fixed.** If stability stays below 80% with every
  wording, the honest outcome is the number and the reopened decision.
- **The pooled 80% is padded by easy rows.** About half of a hold-out shortlist is cross-page
  names labelled unrelated, which Jev rarely misses. The gate stays pooled (the human's
  figure); the per-class line in the summary is what the human reads before accepting a
  passing prompt, and the PR body carries it.

## Domain ground truth (`CONTEXT.md`)

One sentence changes in *Search › Classifier*: "Changing the model or the criteria wording
means re-running `pnpm --filter api tiers:eval`" becomes "Changing the model or the prompt
wording means re-running `pnpm --filter api tiers:eval`, which grades Jev against the
marketplace corpus on the hold-out terms". No tier rule changes.

## Delivery slices

1. **Jev is measured against the marketplaces** — the corpus fixture and screenshots (from
   the capture step, already on the feature branch), the approved labels, the seed path, the
   labels check with the replacement of any corpus-colliding example (round 0's wording), the
   new grader and the rewritten `tiers:eval` with its three runs, two numbers, per-class line,
   group split, `--show-holdout` and gate. Round 0's tables, with the hold-out rows, go in
   this slice's PR body. *Testable:* the grader and labels-check unit tests; the HTTP test
   that the seeded corpus reaches a search; the repository drift test; `tiers:eval` printing
   the tables. *Owns:* the measurement.
2. **The prompt is tuned on the corpus** — the loop (round 1 to at most round 5, with slice
   1's round 0 as the baseline), one commit per round, the round table in the PR body, the
   prompt of the passing round or of round 0, and the `CONTEXT.md` sentence. *Testable:* the
   existing adapter tests still pass with the new wording (the fake Jev does not read the
   criteria); the round table is the evidence. *Owns:* the tuning and the outcome.

A one-slice design was considered and declined: the measurement is worth merging even if
the tuning stalls, and a reviewer should see round 0 before any rewording.

## Decisions and declined alternatives

- Both problems, accuracy and stability, at 80% (human, grill): Mercado Livre itself shows
  7 of 8 identical results on two runs of the same search, which set the number.
- Mercado Livre proves relevance, Amazon Now informs the match/related split (human):
  breadth from the open marketplace, precision from the curated grocer.
- Labels are proposed by the agent from the `CONTEXT.md` rule and approved by the human
  (human): the human does not want to be the labeller, and the marketplaces do not label.
  Declined: a mechanical rule (first row = match) and Amazon's department facet, because
  raisins sit among fresh grapes on Amazon's first row.
- One capture, throwaway script, output committed (human). Declined: a maintained scraper
  (both sites block automation and the truth would move under the eval) and a re-capture
  path (the experiment runs once).
- Six terms, "carne" added by the human for the butcher case; two held out (agent, accepted).
- The loop edits only the prompt, with a hold-out and a stop-on-no-improvement rule (human):
  the alternative, a fixed five rounds with no hold-out, would let a green result prove
  only that the prompt fits the rows it was tuned on.
- Whole search, not Jev alone (human): the experiment is "run their search, run ours".
- Below 80%, ship the measurement and not the prompt (human). Declined: shipping the best
  prompt anyway (noise-level evidence) and blocking the branch (the fixture is useful alone).
- The capture is a design-session step, not an implementation task: Mercado Livre needs the
  human at the keyboard once, and the plan reviewer should see real names and approved labels.
- The fixture is committed on the feature branch as a design-session artefact, not on the
  slice-1 branch (human, spec review round 1): the alternative would move the capture into the
  implementation session, where the implementer cannot pass the Mercado Livre login.
- A failed Jev call makes an eval INVALID rather than FAIL, and an INVALID eval is not a round
  (spec review round 1): a transient timeout must not be read as a worse prompt.
- Declined, forwarded to the plan gate: the eval groups distinct names itself, because
  `tierShortlist` drops unrelated products and the old eval asked once per product row.
- Declined, not worth it: a scheduled re-capture or a committed scraper (see *Non-goals*).
- The corpus-colliding examples are replaced in slice 1 and that wording is round 0 (spec
  review round 2): the eval cannot run on the current examples, so the replacement is part of
  the measurement, not a tuning edit, and merges regardless of the gate.
- The hold-out row tables are hidden behind a flag the loop never passes (spec review round
  2): secrecy enforced by the tool, checkable in the commits, not by an instruction.
- The gate stays pooled; the per-class line is reporting only (spec review round 2): the 80%
  figure is the human's, and the composition is made visible rather than regated.
- A slow-but-successful call is re-run once before it counts as FAIL (spec review round 2):
  latency is Jev's, not the prompt's.
