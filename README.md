# TLAPS-Bench website

A single page with a short introduction and the complex-task **proof-from-scratch** leaderboard. The page has no Benchmark, Home, or Contribute tabs. Earlier proof-completion and historical model results are not loaded or displayed.

## Current results

The leaderboard reports Opus 5 and Muse Spark 1.3 on the selected 72 tasks across 16 specifications. Click a model to see the ten task families in the source document, then a family to see its invariant/property names and verification results. Multi-spec families label each invariant with its specification. Family scores use the document numerator and denominator; usage is summed over the member specs. Model, task-family, and invariant tables support sorting and invariant result filtering. Scores use a continuous red-to-amber-to-green scale with explicit percentages and proved/total counts.

Scores are task pass rates: tasks proved divided by tasks evaluated. Per-invariant verdicts come from the selected module result artifacts and must sum to the document scores. Specification totals preserve the document reporting endpoints, including its treatment of previous attempts and resumed runs. All 72 task IDs must match between the two models.

The leaderboard shows score, time per invariant, tokens per invariant (input plus output), and turns per invariant. Task-family rows show usage totals and per-invariant averages; the invariant detail panel also shows these averages. Costs are not displayed. Usage is recorded per specification run, and result hashes are retained alongside each specification.

Source: sections 3 (task collection), 5 (Opus 5), and 6 (Muse Spark 1.3) of the [experiment summary](https://docs.google.com/document/d/1TpcKAx2Cm5Ft23n6nTTfskS1mbhPcB8DbcTdPtyZjWM/edit), retrieved 2026-09-23. The input records the source URL, retrieval date, and exported-text SHA-256. Only the current 72-task results are published in `data.js`.

## Build and preview

```bash
npm ci
npm run build
node scripts/build-data.mjs --check
python3 -m http.server 8000
```

Open http://localhost:8000. Existing `#/home`, `#/leaderboard`, `#/benchmark`, and `#/cite` links resolve to sections of this same page.

## Edit

- `scripts/site-content.mjs`: introduction copy.
- `results/proof-from-scratch-summary.json`: task collection and reported model results.
- `hub/pages.jsx`: concise introduction and leaderboard heading.
- `hub/leaderboard.jsx`: model, task-family, and invariant tables.
- `hub/leaderboard-utils.js`: formatting and stable sorting reused from the original leaderboard.
- `hub/hub.css`: responsive light/dark presentation.
- `hub/app.jsx`: single-page shell and theme handling.

The data builder checks matching task identities, family/spec coverage, task verdicts, pass totals, usage sums, rounded summary values, and result hashes before writing `data.js`. It does not independently certify the source document's results. Existing proof-completion source archives and maintenance scripts remain in the repository but are not inputs to the current build.

After editing, rebuild and bump the relevant `?v=` asset versions in `index.html`.
