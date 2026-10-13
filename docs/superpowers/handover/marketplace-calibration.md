# Handover — marketplace-calibration

Launch: `cd .claude/worktrees/marketplace-calibration && claude --model opus` then `/implement-stack docs/superpowers/handover/marketplace-calibration.md`
Mode: start
Feature branch: feat/marketplace-calibration
Spec(s): docs/superpowers/specs/2026-10-12-marketplace-calibration-design.md

## Stack

| slice | plan | branch | parent | status | owns |
|---|---|---|---|---|---|
| 1 | docs/superpowers/plans/2026-10-12-marketplace-calibration-slice-1-measurement.md | feat/marketplace-calibration-slice-1-measurement | feat/marketplace-calibration | todo | the measurement — the corpus seed path, the labels and example-collision checks, the `gradeCorpus` grader with its three-run / two-number / per-class / group-split gate, the rewritten `tiers:eval` (with `--show-holdout`, the slow-call re-run and the exit codes), the replacement of the one corpus-colliding example (round 0's wording), and round 0's tables in the PR body. |
| 2 | docs/superpowers/plans/2026-10-12-marketplace-calibration-slice-2-tuning.md | feat/marketplace-calibration-slice-2-tuning | feat/marketplace-calibration-slice-1-measurement | todo | the tuning and the outcome — the bounded loop (rounds 1 to at most 5, slice 1's round 0 as the baseline), one commit per round with its report, the round table, the prompt that ships (the passing round's, or round 0's), and the `CONTEXT.md` sentence. |

## Umbrella PR body

Plan: docs/superpowers/specs/2026-10-12-marketplace-calibration-design.md

**What** — The relevance classifier (TypeSafe Jev) is now graded against what two real marketplaces, Mercado Livre and Amazon Now, return for six grocery searches, instead of against fourteen product names we made up. The eval runs the whole search three times over that corpus and reports two numbers, how often Jev agrees with the approved labels and how often it gives the same answer every run, with an 80% bar on both. A bounded tuning loop then rewords only the instructions sent to Jev, on four of the six searches, and proves the result on the two it never saw.

**Why** — The search-relevance-tiers feature shipped with a known gap: its real-Jev check graded 28 rows, demanded every one right, got 24 to 26 on identical input, and the rows it missed changed from run to run. Twenty-eight invented rows cannot tell a better prompt from noise, so rewording was stopped and the decision was left open in PR #14. Real marketplace pages give a referee that is not ours and a corpus large enough to measure accuracy and stability separately.

**How** — The first page of results for each search on both sites was captured once, by hand, in the design session and committed as a dated fixture of about 240 product names with screenshots; the labels were proposed from the three-tier rule in CONTEXT.md and approved by a human one by one before any tuning. Mercado Livre is broad, so its first page says what people consider relevant; Amazon Now is curated and mixes fresh items with derived ones, so it informs where "match" ends and "related" begins. The gate is pooled over the two hold-out searches and is measured by the tool, not by promise: the hold-out row tables print only behind a flag the loop never passes, so a reviewer can check the commits. A failed Jev call makes an eval invalid rather than a failure, and a slow-but-successful call is re-run once, because neither is evidence about the prompt. The measurement merges whether or not the gate ever passes; a tuned prompt merges only if it does, and otherwise round 0's wording ships and PR #14's decision is reopened with real numbers.

## Slices

<!-- stack -->
| slice | title | PR |
|---|---|---|
| 1 | Jev is measured against the marketplaces | — |
| 2 | The prompt is tuned on the corpus | — |
<!-- /stack -->

## Notes

Spec, plans and this document are transient and are removed from `main` after merge. This
description is the durable record.
