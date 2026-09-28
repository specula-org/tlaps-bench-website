# TLAPS-Bench website

A single page with a short introduction and the complex-task **proof-from-scratch** leaderboard. The page has no Benchmark, Home, or Contribute tabs. Earlier proof-completion and historical model results are not loaded or displayed.

## Current results

The leaderboard reports Opus 5 and Muse Spark 1.3 on the v1.0 set of 56 tasks across 9 specifications. Click a model to see the nine task families, ordered as in the benchmark repository README, then a family to see its invariant/property names and verification results. Multi-spec families label each invariant with its specification. Task-family order follows the [benchmark README](https://github.com/specula-org/tlaps-bench#current-problem-set). Metric columns retain the Google Doc format; scores and resource totals are recomputed from the recorded specification results for this selection. Model, task-family, and invariant tables support sorting and invariant result filtering. Scores use a continuous red-to-amber-to-green scale with explicit percentages and proved/total counts.

Scores are task pass rates: tasks proved divided by tasks evaluated. Per-invariant verdicts come from the selected module result artifacts and must sum to the displayed scores. Specification totals preserve the original reporting endpoints, including their treatment of previous attempts and resumed runs. All 56 task IDs must match between the two models.

The metric columns follow the Opus 5 and Muse Spark 1.3 Google Doc tables: Level, Specs / inv, model score, Total hours, Minutes / inv, Turns / inv, Tokens in / out per inv (M), Cost / inv (USD), and Cost (USD). The main leaderboard displays recomputed Total / average values for each model; expanded task-family tables include all original columns and their Total / average row. Input and output tokens are separate values in millions.

`results/document-metrics.json` contains the two metric tables derived for the current selection, with source-document provenance retained. The data builder compares every cell with the detailed run aggregates and rejects discrepancies. Display precision follows the source: hours have one decimal, minutes and turns per invariant round up, input/output millions use one/three decimals, Opus costs round to whole dollars, and Muse costs use cents. Costs retain the document's API accounting for Opus and Contributor-equivalent basis for Muse. Usage is recorded per specification run; per-invariant resource values are averages.

Problem selection follows the [finalized v1.0 README](https://github.com/specula-org/TLAPS-Bench/blob/047b388697e130e76619c213ae3c5590dd61d5b0/README.md#current-problem-set): HashiCorp Raft is included and B-tree is retired. FLASH is the only cache-coherence specification; Ivy TLB remains included. Original reporting endpoints come from the named Opus 5 and Muse Spark 1.3 tables in the [experiment summary](https://docs.google.com/document/d/1TpcKAx2Cm5Ft23n6nTTfskS1mbhPcB8DbcTdPtyZjWM/edit), retrieved 2026-09-28, supplemented with the archived HashiCorp results (1/6 and 0/6). Those HashiCorp records retain their original benchmark revisions; adding them does not imply a new run on repaired inputs. The input records the source URL, retrieval date, document-text SHA-256, selection commit, and result hashes. Only the current 56-task results are published in `data.js`.

The Retired Problems table includes B-tree (1 specification, 5 targets), attributed to Codex + GPT-6 Astra from the complete repaired-input run at benchmark revision `59dbbe4d1f49f52fc6368d6f56e892e83497b2dc`. Its result and proof hashes are recorded with that row in `results/retired-problems.json`.

## Invariant details

- **Proof size:** effective source lines in the target proof and its transitive local proof dependencies. Blank lines and TLA+ comments are excluded; shared lines are counted once. SANY proof locations define the counted regions.
- **Obligations proved / total:** final `proved` or `trivial` statuses for this target's obligations. The overall Result still uses dependency-closed grading. An omitted/unexamined proof has no progress value.
- **Check time:** approximate wall time for this target's TLAPM invocation, rounded to whole seconds for display. It is recovered from the archived second-resolution launch timestamp and the unit receipt's completion timestamp. Older sequential logs use the next invocation timestamp as the boundary. It excludes separate helper checks and model generation. Omitted or unexamined proofs display `—`. No new verification run is represented by these values.
- **View proof:** opens the recorded target and its supporting proof units, with a full-module download. The 18 referenced content-addressed bundles preserve the original submitted source; the viewer checks its SHA-256 before display.

Both model and task-family details animate open and closed. Reduced-motion preferences disable these transitions.

## Build and preview

```bash
npm ci
npm run build
node scripts/build-data.mjs --check
python3 -m http.server 8000
```

Open http://localhost:8000. Existing `#/home`, `#/leaderboard`, `#/benchmark`, and `#/cite` links resolve to sections of this same page.

## Edit

- `scripts/site-content.mjs`: introduction copy and task-family order from the benchmark README.
- `results/proof-from-scratch-summary.json`: the pinned v1.0 specification and target IDs, with detailed model results.
- `results/document-metrics.json`: original metric headings and recomputed displayed cells for the current Opus 5 and Muse Spark 1.3 selection.
- `hub/pages.jsx`: concise introduction and leaderboard heading.
- `hub/leaderboard.jsx`: model, task-family, and invariant tables, including animated disclosures.
- `hub/proof-viewer.jsx`: read-only proof viewer.
- `proofs/*.json`: source modules and local proof-dependency metadata.
- `scripts/proof-metrics.mjs`: comment-aware proof-line counting and dependency traversal.
- `hub/leaderboard-utils.js`: formatting and stable sorting reused from the original leaderboard.
- `hub/hub.css`: responsive light/dark presentation.
- `hub/app.jsx`: single-page shell and theme handling.

The data builder checks exact coverage of the pinned v1.0 task manifest, matching task identities, family/spec coverage, task verdicts, pass totals, usage sums, rounded summary values, all source-table cells, result/source/bundle hashes, proof-line counts, dependency closures, and timing evidence before writing `data.js`. It does not independently certify the source document's results. Existing proof-completion source archives and maintenance scripts remain in the repository but are not inputs to the current build.

After editing, rebuild and bump the relevant `?v=` asset versions in `index.html`.
