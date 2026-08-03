# TLAPS-Bench website

Static site for the TLAPS Proof Benchmark.

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

## Edit

- Model runs live in `results/*.json`.
- Page copy lives in `scripts/site-content.mjs`.
- Tables are generated from the result records.

After changing either input, rebuild the browser data:

```bash
node scripts/build-data.mjs
```

Use `--check` to validate without rewriting `data.js`.

## Adding a model

1. Drop the run into `results/<backend-id>.json` and set `meta.backend` and every record's `backend` to that id.
2. Add a `BACKEND_INFO` entry in `scripts/build-data.mjs`.
3. Add an `OUTPUT_PRICING` entry if a public output rate is known.
4. Rebuild, then bump the `?v=` cache-buster on `data.js` in `index.html`.
