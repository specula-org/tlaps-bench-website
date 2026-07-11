# TLAPS-Bench website

Static site for the TLAPS Proof Benchmark.

Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000


# Edit

- Model runs live in `results/*.json`.
- Hand-written page copy lives in `scripts/site-content.mjs`.
- The category, spec, and score tables are generated from the result records.

After changing either input, rebuild the browser data:

```bash
node scripts/build-data.mjs
```

Use `node scripts/build-data.mjs --check` to validate all 714 records without
rewriting `data.js`.
