#!/usr/bin/env node
// Regenerate results/core-manifest.json from a Proof Completion Core result bundle.
//
//   node scripts/sync-core-manifest.mjs results/codex-gpt-5.6-sol.json
//   node scripts/sync-core-manifest.mjs   # defaults to the first Core-looking results/*.json
//
// After updating the Core task set, point this at any complete Core run, rebuild
// data.js, and replace published result bundles so every model covers the same tasks.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const MODE = "proof-completion";
const OUT = "results/core-manifest.json";

const pickSource = () => {
  const arg = process.argv[2];
  if (arg) return arg;
  const candidates = readdirSync("results")
    .filter((f) => f.endsWith(".json") && f !== "core-manifest.json")
    .sort();
  for (const f of candidates) {
    const { meta, results } = JSON.parse(readFileSync(`results/${f}`, "utf8"));
    if (meta?.suite === "proof-completion-core") return `results/${f}`;
    if (typeof meta?.result_set === "string" && meta.result_set.includes("-core")) {
      return `results/${f}`;
    }
    if (Array.isArray(results) && results.length > 0 &&
        results.every((r) => r.mode === MODE)) {
      return `results/${f}`;
    }
  }
  throw new Error("no Core result bundle found; pass a path explicitly");
};

const sourcePath = pickSource();
const { meta, results } = JSON.parse(readFileSync(sourcePath, "utf8"));
if (!Array.isArray(results) || results.length === 0) {
  throw new Error(`${sourcePath}: empty results[]`);
}
for (const r of results) {
  if (r.mode !== MODE) {
    throw new Error(`${sourcePath}: expected only ${MODE}, found ${r.mode} on ${r.benchmark}`);
  }
  if (typeof r.benchmark !== "string" || !r.benchmark.includes("/")) {
    throw new Error(`${sourcePath}: bad benchmark ${r.benchmark}`);
  }
  if (typeof r.source !== "string" || !r.source) {
    throw new Error(`${sourcePath}: missing source on ${r.benchmark}`);
  }
  if (typeof r.theorem !== "string" || !r.theorem) {
    throw new Error(`${sourcePath}: missing theorem on ${r.benchmark}`);
  }
}

let previousSpecIds = new Map();
try {
  const previous = JSON.parse(readFileSync(OUT, "utf8"));
  for (const t of previous.tasks ?? []) {
    if (t.benchmark && t.spec_id) previousSpecIds.set(t.benchmark, t.spec_id);
  }
} catch {
  previousSpecIds = new Map();
}

const tasks = [...results]
  .map((r) => {
    const task = { benchmark: r.benchmark, theorem: r.theorem, source: r.source };
    const specId = r.spec_id || previousSpecIds.get(r.benchmark);
    if (specId) task.spec_id = specId;
    return task;
  })
  .sort((a, b) => a.benchmark.localeCompare(b.benchmark));
const ids = new Set(tasks.map((t) => t.benchmark));
if (ids.size !== tasks.length) {
  throw new Error(`${sourcePath}: duplicate benchmarks in Core bundle`);
}
const missingSpecIds = tasks.filter((t) => !t.spec_id).map((t) => t.benchmark);
if (missingSpecIds.length) {
  throw new Error(
    `${OUT}: missing originating spec_id for ${missingSpecIds.length} task(s); ` +
    `preserve them from the previous manifest or set results[].spec_id. ` +
    `sample: ${missingSpecIds.slice(0, 5).join(", ")}`,
  );
}

const sources = {};
for (const t of tasks) sources[t.source] = (sources[t.source] ?? 0) + 1;

const manifest = {
  suite: "proof-completion-core",
  mode: MODE,
  task_count: tasks.length,
  generated_from: sourcePath.replace(/^results\//, ""),
  note: "Canonical Proof Completion Core task list. Regenerate with: node scripts/sync-core-manifest.mjs <results-file.json>",
  sources: Object.fromEntries(Object.entries(sources).sort(([a], [b]) => a.localeCompare(b))),
  tasks,
};

writeFileSync(OUT, JSON.stringify(manifest, null, 2) + "\n");
const specCount = new Set(tasks.map((t) => t.spec_id)).size;
console.log(`Wrote ${OUT}: ${tasks.length} tasks / ${specCount} originating specifications from ${sourcePath}` +
  (meta?.backend ? ` (${meta.backend})` : ""));
