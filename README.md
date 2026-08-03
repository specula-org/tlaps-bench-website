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

Use `node scripts/build-data.mjs --check` to validate every bundle without
rewriting `data.js`.

## Adding a model

1. Drop the run into `results/<backend-id>.json` and rewrite `meta.backend` and
   every record's `backend` to that id.
2. Add a `BACKEND_INFO` entry in `scripts/build-data.mjs` (display name, agent
   subname, org, kind).
3. Add an `OUTPUT_PRICING` entry if a public standard-tier output rate is known.
   Without one the model still publishes, but its cost columns show a dash
   instead of a guessed number. Mixed-model runs must also audit
   `usage_audit.output_usage_by_model` and each affected row's
   `secondary_model_usage` so every recorded output token uses the right rate.
4. Rebuild, then bump the `?v=` cache-buster on `data.js` in `index.html`.

A bundle may cover both modes or only one. Each mode it does cover must be
complete: the full per-source task counts, and task identities byte-identical to
the anchor bundle (the alphabetically first bundle covering both modes). A model
that skipped a mode shows a dash and ranks last in that mode's table.

## Incomplete runs

Two gaps can be published rather than papered over. Both must be declared in
`meta`, and both are validated against the records — an undeclared difference
still throws.

**A run graded against a different revision of a spec** declares
`meta.manifest_exception`:

```json
"manifest_exception": {
  "reason": "Run predates the upstream split of the EWD687a spec ...",
  "missing_tasks": [{ "mode": "...", "benchmark": "...", "source": "..." }],
  "extra_tasks":   [{ "mode": "...", "benchmark": "...", "source": "..." }]
}
```

Every canonical task listed under `missing_tasks` must genuinely be absent, every
`extra_tasks` entry genuinely present, and the rest of the manifest must still
match the anchor exactly. The model is scored over the tasks it actually ran and
is labelled partial-scope in the leaderboard — a `473/483` chip on its row, the
canonical denominator on each affected spec, and the reason in its detail panel.
Unrun tasks are never counted as failures.

**A run whose telemetry did not flush for some tasks** sets
`usage_audit.output_tokens_partial: true` and `tasks_with_output_tokens: <n>`.
Those rows omit `output_tokens` entirely; a missing count means unknown and
renders as a dash, never as zero. Token and cost totals become sums over the rows
that do carry counts, published as lower bounds.

Prefer fixing the run. Use these only when re-running is not possible.
