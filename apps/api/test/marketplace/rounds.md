# Corpus eval rounds (spec § The tuning loop)

Tuning terms: banana, pão, frango, carne. Hold-out: uva, papel higiênico. Gate: hold-out agreement ≥ 80% in every run and stability ≥ 80% (spec § The gate).

Margin: 100 / 185 = 0.54 percentage points. A round improves only if its tuning mean exceeds the best previous round's by more than the margin.

| round | edit | tuning mean | hold-out run 1 | run 2 | run 3 | hold-out stability | verdict | improved? |
|---|---|---|---|---|---|---|---|---|
| 0 | slice 1: "Pão francês" example → "Pão sírio" | 76.58% | 95.0% | 95.0% | 95.0% | 100.0% | PASS | baseline |

## Round 0

### tuning (185 rows)
| class | rows | run 1 | run 2 | run 3 |
|---|---|---|---|---|
| pooled | 185 | 141/185 (76.2%) | 144/185 (77.8%) | 140/185 (75.7%) |
| match | 69 | 65/69 (94.2%) | 66/69 (95.7%) | 65/69 (94.2%) |
| related | 67 | 38/67 (56.7%) | 40/67 (59.7%) | 37/67 (55.2%) |
| unrelated | 49 | 38/49 (77.6%) | 38/49 (77.6%) | 38/49 (77.6%) |

stability 176/185 (95.1%)
tuning mean 76.58% (3 runs · 185 rows · margin 0.54 pp)

### hold-out (100 rows)
| class | rows | run 1 | run 2 | run 3 |
|---|---|---|---|---|
| pooled | 100 | 95/100 (95.0%) | 95/100 (95.0%) | 95/100 (95.0%) |
| match | 28 | 28/28 (100.0%) | 28/28 (100.0%) | 28/28 (100.0%) |
| related | 27 | 24/27 (88.9%) | 24/27 (88.9%) | 24/27 (88.9%) |
| unrelated | 45 | 43/45 (95.6%) | 43/45 (95.6%) | 43/45 (95.6%) |

stability 100/100 (100.0%)

Outcome: round 0 passed the hold-out; its wording ships. The final `--show-holdout` report is in the PR body.
