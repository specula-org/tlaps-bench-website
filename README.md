# TLAPS-Bench website

Static site for the TLAPS Proof Benchmark.

The published leaderboard is **Proof Completion Core only**: every model is graded on the same task list in `results/core-manifest.json` (currently 293 proof-completion tasks). Proof-from-scratch and Full-suite runs are not shown.

A bundle is published only when it covers that Core set **exactly**. Older Full-suite dumps that omit Apalache (`ben-or83`, `tendermint`) or other Core tasks cannot appear on the leaderboard, even if they were produced this week — their numbers would not be comparable.

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

## Edit

- Model runs live in `results/<backend-id>.json` (must cover the Core task set exactly).
- The Core task list lives in `results/core-manifest.json`.
- Page copy lives in `scripts/site-content.mjs`.

After changing results or content, rebuild:

```bash
node scripts/build-data.mjs
```

Use `--check` to validate without rewriting `data.js`.

## Updating the Core

When the Core task set changes:

1. Drop a complete Core result bundle into `results/`.
2. Regenerate the manifest:

```bash
node scripts/sync-core-manifest.mjs results/<that-bundle>.json
```

3. Replace every published model run so each covers the new Core exactly (same benchmarks, theorems, and sources).
4. Rebuild and bump the `?v=` cache-buster on `data.js` in `index.html`.

## Adding a model

1. Drop the run into `results/<backend-id>.json` with `meta.backend` set to that id, `meta.cohort` of `one-shot` or `agentic`, and results for every Core task.
2. Add a `BACKEND_INFO` entry in `scripts/build-data.mjs` and list the id in `PUBLISHED_BACKENDS`.
3. Add an `OUTPUT_PRICING` entry if a public output rate is known.
4. Rebuild, then bump the `?v=` cache-buster on `data.js` in `index.html`.
