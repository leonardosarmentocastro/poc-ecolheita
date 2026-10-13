# Marketplace calibration — slice 2: the prompt is tuned on the corpus — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Reviewed:** round 1 (2026-10-12).
**Owns:** the tuning and the outcome — the bounded loop (rounds 1 to at most 5, slice 1's round 0 as the baseline), one commit per round with its report, the round table, the prompt that ships (the passing round's, or round 0's), and the `CONTEXT.md` sentence.

**Goal:** Jev's prompt is reworded, round by round, on the four tuning searches until the two hold-out searches pass the 80% gate, or the loop stops; whichever happens, the PR shows every round's numbers and ships either the passing wording or round 0's.

**Architecture:** No new modules. Each round edits only the prompt (`criteria.ts`, and the `state` line and per-question `instructions` in `jev-classifier.ts`), runs `tiers:eval` without `--show-holdout`, commits the wording and the report under `apps/api/test/marketplace/rounds/round-N.md`, and appends a row to `rounds.md`. The stop rules are mechanical and written down before round 1. The hold-out row tables are read once, at the end, for the PR body, and never committed.

**Tech Stack:** the same as slice 1: TypeScript, Vitest (the adapter tests pin the request shape), tsx, TypeSafe Jev `jev-1.13.0`.

**Spec:** `docs/superpowers/specs/2026-10-12-marketplace-calibration-design.md` — read § The tuning loop (all of it, including the rules), § The gate, § A failed call, § A slow call, § Outcome, § Accepted risks, § Domain ground truth.

## Global Constraints

- **Levers.** A round may change only: `TIER_CRITERIA` (`what`, `not_for`, `examples`) in `apps/api/src/modules/relevance/criteria.ts`; the `state` template and the per-question `instructions` template in `apps/api/src/modules/relevance/jev-classifier.ts`. Nothing else in `src/` changes in a round. The adapter tests in `jev-classifier.test.ts` assert the exact `state` and `instructions` strings; when a round changes a template, the same commit updates those assertions and nothing else in that test file.
- **Frozen.** `CORPUS_LABELS`, `CORPUS_OVERRIDES`, `CORPUS`, the model `jev-1.13.0`, the 2000 ms timeout, the shortlist, `AGREEMENT_FLOOR`, `STABILITY_FLOOR`, `LATENCY_BUDGET_MS`, `RUNS`, the printer and the checks. A label the implementer believes is wrong goes in the PR body under a heading "Labels I would question", with the reason; the label is not changed.
- **Examples.** Every example keeps the shape `"<product>" for "<search>"`. Its product must not equal or sit inside any corpus or scenario name (the eval's check exits 3 otherwise; `corpus-check.test.ts` fails too). Examples may use any grocery name outside the corpus.
- **Never `--show-holdout` in a round.** The loop runs `pnpm --filter api tiers:eval` with no flag. The hold-out is read only through the two summary tables. The flag is used exactly once, after the loop has stopped, and that output is pasted into the PR body, not committed.
- **Baseline.** Round 0 is slice 1's `apps/api/test/marketplace/rounds/round-0.md` and the wording merged by slice 1. It is not re-run.
- **Tuning mean** = (run 1 + run 2 + run 3 pooled agreement of the tuning group) ÷ 3, read from the `## tuning` summary's `pooled` line. **Margin** = 1 ÷ tuning rows (the `## tuning (N rows)` heading; with today's corpus N is about 185, so the margin is about 0.54 percentage points). A round **improves** only if its tuning mean exceeds the best previous round's by more than the margin.
- **Stop rules**, checked after every round, in this order: (1) the round's verdict is PASS → stop; (2) the round did not improve → stop; (3) the round number is 5 → stop. The loop never runs a round 6.
- **INVALID** (exit 2): the round is re-run with the same wording; it does not count as a round. Three INVALID results in a row stop the loop; report the failure kinds to the human in the PR body.
- **FAIL on latency only** is handled inside the CLI (one automatic re-run); the printed verdict is what counts.
- **CHECK FAILED** (exit 3) inside a round means the round's examples collided: fix the example and re-run; it is not a round.
- **Outcome** (spec § Outcome): if any round is PASS, that round's wording stays. Otherwise the prompt files are restored byte-for-byte to the parent branch's content (round 0) in a final commit; the round files and `rounds.md` stay.
- Local gates before the PR: `pnpm test`, `pnpm test:stories`, `pnpm e2e`.
- Commit style: `feat(api): round N — <one line on what was reworded>`; `chore(api): …`; `docs: …`; every message ends with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

- A committed round file must contain no hold-out **row table**. A reviewer checks `grep -lE "^### (uva|papel higiênico) \(" apps/api/test/marketplace/rounds/` is empty. Hold-out product *names* do appear inside the tuning tables as cross-page rows ("Uva Crimson" is in the banana and frango shortlists, labelled for those terms); that is not a leak. → Task 2 Step 5 (the loop greps before committing).
- A rewording that mentions a corpus product in prose (not as an example) is not caught by the example check, yet leaks the answer. The prose (`what`, `not_for`, `state`, `instructions`) must not name any protected product either. → Task 2 Step 2 rule and Step 3 grep.
- A round that changes `state` without updating the adapter test's exact-string assertion leaves `pnpm test` red; the gate must be green at every commit. → Task 2 Step 3.
- After a never-PASS outcome, the prompt must equal round 0's exactly; a stray improved example left behind would ship untested wording. → Task 3 Step 2 (`git diff <parent> --stat` on the three prompt files is empty).
- A noisy gain (one row's worth) must not be read as an improvement, and a noisy loss must not be read as a regression that stops the loop early. → the margin rule in Task 2 Step 6; Task 1 computes the margin from round 0's row count before round 1 starts.

---

### Task 1: The baseline and the round table

**Files:**
- Create: `apps/api/test/marketplace/rounds.md`
- Read: `apps/api/test/marketplace/rounds/round-0.md` (slice 1), `apps/api/src/modules/relevance/criteria.ts`, `apps/api/src/modules/relevance/jev-classifier.ts`

**Interfaces:**
- Consumes: slice 1's round-0 report; the printer's line shapes (`## tuning (N rows)`, `| pooled | N | a% | b% | c% |`, `stability s%`, the verdict line).
- Produces: `rounds.md` with the round-0 row and the margin; every later task appends to it.

- [ ] **Step 1: Read round 0**

Open `apps/api/test/marketplace/rounds/round-0.md`. Note, from the `## tuning` section: the row count `N` in the heading and the three pooled percentages; from `## hold-out`: the three pooled percentages and the stability line; and the verdict line. Compute `tuning mean = (a + b + c) / 3` and `margin = 100 / N` percentage points.

- [ ] **Step 2: Write the round table**

```markdown
# Corpus eval rounds (spec § The tuning loop)

Tuning terms: banana, pão, frango, carne. Hold-out: uva, papel higiênico. Gate: hold-out agreement ≥ 80% in every run and stability ≥ 80% (spec § The gate).

Margin: 100 / <N> = <m> percentage points. A round improves only if its tuning mean exceeds the best previous round's by more than the margin.

| round | edit | tuning mean | hold-out run 1 | run 2 | run 3 | hold-out stability | verdict | improved? |
|---|---|---|---|---|---|---|---|---|
| 0 | slice 1: "Pão francês" example → "Pão sírio" | <x.x>% | <a>% | <b>% | <c>% | <s>% | <PASS/FAIL> | baseline |
```

Fill every `<…>` from Step 1. Also copy the full `## tuning` and `## hold-out` summary tables of round 0 under a `## Round 0` heading below the table, so a reader of this file sees the per-class numbers without opening the round file.

- [ ] **Step 3: Commit**

```bash
git add apps/api/test/marketplace/rounds.md
git commit -m "chore(api): corpus eval round table with slice 1's round 0 as baseline

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

If round 0's verdict is already PASS, skip Task 2: go to Task 3 with "passing round = 0".

---

### Task 2: One round of the loop (repeat for rounds 1 to at most 5)

**Files:**
- Modify: `apps/api/src/modules/relevance/criteria.ts`, `apps/api/src/modules/relevance/jev-classifier.ts` (templates only), `apps/api/src/modules/relevance/__tests__/jev-classifier.test.ts` (exact-string assertions only, when a template changed), `apps/api/test/marketplace/rounds.md`
- Create: `apps/api/test/marketplace/rounds/round-<N>.md`

**Interfaces:**
- Consumes: the previous rounds' reports; the stop rules and margin from Global Constraints.
- Produces: one commit per round holding the wording and its report, and a new row in `rounds.md`.

- [ ] **Step 1: Decide what to reword, from the tuning rows only**

Open the previous round's report (`round-<N-1>.md`). Read the four tuning row tables and the tuning per-class summary. Find the pattern behind the wrong rows: for example, processed forms labelled match that Jev calls related (shredded chicken, charque), or chicken on the carne page labelled related that Jev calls match, or candy flavoured with the fruit that Jev calls unrelated. Choose **one** idea per round, in plain words, and write it down before editing: "round N: tell Jev that a cooked or shredded form of the thing is still the thing". The hold-out **row tables** are not in the file by design; the `## hold-out` summary is, and it is read only to fill the round table, never to decide what to reword. Use only the four tuning row tables and the tuning summary for this decision.

- [ ] **Step 2: Edit the prompt**

Edit `TIER_CRITERIA` in `criteria.ts` (the `what` / `not_for` sentences and the examples) and, if the idea is about context rather than the rule, the `state` template or the `instructions` template in `jev-classifier.ts`. Rules while editing:

- examples keep the shape `"<product>" for "<search>"` and name no corpus or scenario product (see `PROTECTED_NAMES`), not even partially;
- the prose (`what`, `not_for`, `state`, `instructions`) names no corpus or scenario product either; describe the kind ("a cooked or shredded form"), never the listing;
- keep the three tiers' meaning as `CONTEXT.md` defines them; the wording explains the rule, it does not change it.

- [ ] **Step 3: Keep the adapter tests exact**

If the `state` or `instructions` template changed, update the matching exact-string expectations in `jev-classifier.test.ts` ("sends one choice question per candidate…" and "escapes quotes and backslashes…"). Then:

Run: `cd apps/api && pnpm exec vitest run src/modules/relevance && pnpm typecheck && pnpm lint`
Expected: PASS and clean. The example-collision test in `corpus-check.test.ts` runs here; a collision fails now, before any Jev call.

Then check the prose for protected names by hand, since the check covers examples only:

Run: `cd apps/api && pnpm exec tsx -e 'import { PROTECTED_NAMES } from "./src/modules/relevance/corpus-check.ts"; import { TIER_CRITERIA } from "./src/modules/relevance/criteria.ts"; const prose = Object.values(TIER_CRITERIA).flatMap(c => [c.what, c.not_for ?? ""]).join(" ").toLowerCase(); console.log(PROTECTED_NAMES.filter(n => prose.includes(n.toLowerCase())))'`
Expected: `[]`. (If the `@/` alias is needed, run it as a one-off file under `src/db/` and delete it before committing.)

- [ ] **Step 4: Run the round**

Run: `pnpm --filter api tiers:eval > apps/api/test/marketplace/rounds/round-<N>.md; echo "exit $?"`

Expected: exit 0 (PASS) or 1 (FAIL). On exit 2 (INVALID): run the same command again, overwriting the file; the attempt is not a round. After three INVALID results in a row, stop the loop and go to Task 3 with "no passing round; Jev unreachable", recording the failure kinds printed on stderr. On exit 3 (CHECK FAILED): the examples collided; fix them (Step 2) and run again; not a round.

- [ ] **Step 5: Confirm nothing hold-out leaked, then record the round**

Run: `grep -c "hold-out rows hidden" apps/api/test/marketplace/rounds/round-<N>.md; grep -cE "^### (uva|papel higiênico) \(" apps/api/test/marketplace/rounds/round-<N>.md`
Expected: `1`, then `0`. (The `## hold-out` summary is allowed and expected; a `### uva (` or `### papel higiênico (` row-table heading is the leak. Hold-out product names inside the tuning tables are cross-page rows, not a leak.)

Append a row to `rounds.md`:

```markdown
| <N> | <the one-line idea from Step 1> | <tuning mean>% | <a>% | <b>% | <c>% | <s>% | <verdict> | <yes/no> |
```

`improved?` = yes only if `tuning mean − best previous tuning mean > margin`.

- [ ] **Step 6: Commit the round**

```bash
git add apps/api/src/modules/relevance apps/api/test/marketplace/rounds.md apps/api/test/marketplace/rounds/round-<N>.md
git commit -m "feat(api): round <N> — <the one-line idea>

tuning mean <x>% (best before: <y>%), hold-out <a>/<b>/<c>%, stability <s>%: <verdict>

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

- [ ] **Step 7: Apply the stop rules**

1. Verdict PASS → stop; go to Task 3 with "passing round = N".
2. `improved? = no` → stop; go to Task 3 with "no passing round; stopped on no improvement after round N".
3. N = 5 → stop; go to Task 3 with "no passing round; ceiling".
4. Otherwise, repeat Task 2 for round N + 1.

---

### Task 3: The outcome

**Files:**
- Modify (only in the never-PASS case): `apps/api/src/modules/relevance/criteria.ts`, `apps/api/src/modules/relevance/jev-classifier.ts`, `apps/api/src/modules/relevance/__tests__/jev-classifier.test.ts`
- Modify: `apps/api/test/marketplace/rounds.md` (the outcome line)

**Interfaces:**
- Consumes: the round table; the parent branch's prompt files (round 0's wording).
- Produces: the wording that ships, and the final hold-out report for the PR body (not committed).

- [ ] **Step 1 (passing round = P): keep the wording, run the final report**

Run: `pnpm --filter api tiers:eval --show-holdout > /tmp/final-holdout.md; echo "exit $?"`
Expected: a full report with the hold-out row tables below the marker. This run is for the PR body only; it is not committed and does not change the round table. If its verdict differs from round P's (noise), say so in the PR body; round P is the result that stands.

Append to `rounds.md`:

```markdown
Outcome: round <P> passed the hold-out; its wording ships. The final `--show-holdout` report is in the PR body.
```

- [ ] **Step 1 (no passing round): restore round 0's wording**

The parent branch (slice 1's branch, or the feature branch once slice 1 merged; the handover's stack table names it) holds round 0's wording. Restore the three files from it without checking anything out:

```bash
PARENT=<parent ref from the stack table>
for f in apps/api/src/modules/relevance/criteria.ts apps/api/src/modules/relevance/jev-classifier.ts apps/api/src/modules/relevance/__tests__/jev-classifier.test.ts; do
  git show "$PARENT:$f" > "$f"
done
git diff "$PARENT" --stat -- apps/api/src/modules/relevance
```

Expected: the diff is empty for those three files (other files under `relevance/` were not touched by this slice either, so the whole stat is empty). Then run the final report once for the PR body:

Run: `pnpm --filter api tiers:eval --show-holdout > /tmp/final-holdout.md; echo "exit $?"`

Append to `rounds.md`:

```markdown
Outcome: no round passed the hold-out; round 0's wording ships unchanged. Best round: <B> (tuning mean <x>%, hold-out <a>/<b>/<c>%, stability <s>%). The decision from PR #14 is reopened in this PR's body.
```

- [ ] **Step 2: Verify and commit the outcome**

Run: `cd apps/api && pnpm exec vitest run src/modules/relevance && pnpm typecheck && pnpm lint`
Expected: PASS and clean.

```bash
git add apps/api/src/modules/relevance apps/api/test/marketplace/rounds.md
git commit -m "chore(api): corpus tuning outcome — <round P's wording ships | round 0's wording restored>

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: `CONTEXT.md`

**Files:**
- Modify: `CONTEXT.md` (the Classifier bullet under § Search)

- [ ] **Step 1: Change one sentence**

Replace

```
  Changing the model or the criteria wording means re-running `pnpm --filter api tiers:eval`.
```

with

```
  Changing the model or the prompt wording means re-running `pnpm --filter api tiers:eval`,
  which grades Jev against the marketplace corpus on the hold-out terms.
```

No other line of `CONTEXT.md` changes.

- [ ] **Step 2: Commit**

```bash
git add CONTEXT.md
git commit -m "docs: tiers:eval grades Jev against the marketplace corpus

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Local gates and the PR body

- [ ] **Step 1: Run the mandated gates from the repository root**

Run: `pnpm test && pnpm test:stories && pnpm e2e`
Expected: all green.

- [ ] **Step 2: Draft the PR body** (the orchestrator opens the PR)

```
Plan: docs/superpowers/plans/2026-10-12-marketplace-calibration-slice-2-tuning.md

**What** — The instructions sent to the relevance classifier were reworded, one idea per round, and measured each time against the marketplace corpus. <Either:> The wording from round <P> passes the 80% gate on the two searches it was never tuned on, and ships. <Or:> No wording reached the gate; the instructions ship unchanged, and the numbers below reopen the decision left in PR #14.

**Why** — A prompt tuned on the same rows it is graded on proves only that it fits those rows. Tuning on four searches and grading on two unseen ones says whether the change generalises.

**How** — Each round changed only the prompt, never a label, the model or the gate, and stopped when the hold-out passed, when a round did not beat the best one by more than one row's worth, or at round 5. The hold-out rows were hidden from the loop by the tool and printed once, at the end, for this body.

## Rounds

<paste the table from apps/api/test/marketplace/rounds.md>

## Final hold-out report (round <P or 0>)

<paste /tmp/final-holdout.md in full>

## Labels I would question
<one line each, or "none">

## Review decisions
<filled by /implement-stack from the slice review>
```

If no round passed, add a short section **"Decision reopened"** listing the three options from the spec in plain words: accept today's accuracy as a known risk; ask Jev three times per search and take the majority, at three times the latency and cost; or try a different classifier (issue #10). State the best round's hold-out numbers next to each so the human decides with data.
