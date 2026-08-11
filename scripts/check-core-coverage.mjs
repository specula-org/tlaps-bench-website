#!/usr/bin/env node
// Report how a result bundle covers results/core-manifest.json.
// Exit 0 only when coverage is exact (same 293 Core tasks).
//
//   node scripts/check-core-coverage.mjs path/to/bundle.json
import { readFileSync } from "node:fs";

const MODE = "proof-completion";
const core = JSON.parse(readFileSync("results/core-manifest.json", "utf8"));
const coreBench = new Set(core.tasks.map((t) => t.benchmark));
const path = process.argv[2];
if (!path) {
  console.error("usage: node scripts/check-core-coverage.mjs <bundle.json>");
  process.exit(2);
}
const bundle = JSON.parse(readFileSync(path, "utf8"));
const rows = (bundle.results || []).filter((r) => r.mode === MODE);
const have = new Set(rows.map((r) => r.benchmark));
const missing = [...coreBench].filter((b) => !have.has(b)).sort();
const extra = [...have].filter((b) => !coreBench.has(b)).sort();
const passes = rows.filter((r) => coreBench.has(r.benchmark) && r.check_verdict === "PASS").length;
const covered = rows.filter((r) => coreBench.has(r.benchmark)).length;
console.log(JSON.stringify({
  path,
  core: core.task_count,
  proof_completion_rows: rows.length,
  core_covered: covered,
  core_pass: passes,
  missing: missing.length,
  extra: extra.length,
  exact: missing.length === 0 && extra.length === 0 && covered === core.task_count,
  missing_sample: missing.slice(0, 12),
}, null, 2));
process.exit(missing.length === 0 && extra.length === 0 && covered === core.task_count ? 0 : 1);
