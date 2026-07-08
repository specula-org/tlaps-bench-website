// Turn results/<backend>.json files into data.js (window.TLAPS_DATA).
// Deterministic and total: same inputs -> same output; anything suspicious -> throw.
// All validation lives here so the UI can assume complete, trustworthy data.
//
//   node scripts/build-data.mjs
//
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { SITE } from "./site-content.mjs";

const MODES = ["proof-completion", "proof-from-scratch"];

// Canonical manifest: per-source totals [proof-completion, proof-from-scratch].
// Update only when the benchmark version changes.
const CANONICAL = {
  "tlaplus/Examples": [379, 126],
  "TLAPS distribution examples": [103, 57],
  "ZooKeeper (Remix)": [0, 18],
  "Ivy liveness": [0, 12],
  "etcd (Specula)": [0, 8],
  "AbstractRaft": [0, 4],
  "OpenAddressing (lemmy/Examples)": [1, 5],
  "Anvil": [0, 1],
};
const RECORDS = 714;

// The one hand-maintained table: display info per backend id.
// name = agent (primary label); subname = the underlying model, shown below it.
const BACKEND_INFO = {
  copilot: { name: "GitHub Copilot", subname: "Opus-4.8", org: "GitHub", logo: null, kind: "agent" },
  codex: { name: "OpenAI Codex", subname: "gpt-5.5", org: "OpenAI", logo: null, kind: "agent" },
};

// Reader-facing dataset labels (the canonical keys above must match results[].source,
// so renaming for display happens here). Keeps the leaderboard names clear and untruncated.
const DISPLAY_NAME = {
  "tlaplus/Examples": "Official TLA+ Examples",
  "OpenAddressing (lemmy/Examples)": "OpenAddressing",
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const r1 = (x) => Math.round(x * 10) / 10;

const models = readdirSync("results").filter((f) => f.endsWith(".json")).map((f) => {
  const { meta, results } = JSON.parse(readFileSync(`results/${f}`, "utf8"));

  // ---- validate: recompute from results[], check against canon and meta ----
  if (results.length !== RECORDS) throw new Error(`${f}: ${results.length} records != ${RECORDS}`);
  const byMode = {}, bySource = {}, bySpec = {};
  for (const r of results) {
    if (!["PASS", "FAIL", "CHEATING"].includes(r.check_verdict))
      throw new Error(`${f}: ${r.benchmark} [${r.mode}] has infra verdict ${r.check_verdict} - re-run before publishing`);
    if (!CANONICAL[r.source]) throw new Error(`${f}: unknown source "${r.source}"`);
    const m = (byMode[r.mode] ??= { total: 0, PASS: 0, CHEATING: 0 });
    m.total++; m[r.check_verdict] = (m[r.check_verdict] ?? 0) + 1;
    const s = (bySource[r.source] ??= { pass: 0, fail: 0, cheat: 0, total: 0, perMode: {} });
    s.total++;
    if (r.check_verdict === "PASS") s.pass++;
    else if (r.check_verdict === "CHEATING") s.cheat++;
    else s.fail++;
    const pm = (s.perMode[r.mode] ??= { pass: 0, total: 0 });
    pm.total++;
    if (r.check_verdict === "PASS") pm.pass++;
    // Break the large tlaplus/Examples bucket down by individual spec, so the
    // leaderboard can expand it into a per-spec breakdown of the same shape.
    if (r.source === "tlaplus/Examples") {
      const spec = r.benchmark.split("/")[0].replace(/^tlaplus_examples_/, "");
      const sp = (bySpec[spec] ??= { perMode: {} });
      const spm = (sp.perMode[r.mode] ??= { pass: 0, total: 0 });
      spm.total++;
      if (r.check_verdict === "PASS") spm.pass++;
    }
  }
  for (const [src, [pc, pfs]] of Object.entries(CANONICAL)) {
    const got = bySource[src]?.perMode ?? {};
    if ((got["proof-completion"]?.total ?? 0) !== pc || (got["proof-from-scratch"]?.total ?? 0) !== pfs)
      throw new Error(`${f}: ${src} counts don't match the canonical manifest`);
  }
  for (const m of MODES) { // cross-check recomputed rates vs the file's own summaries
    const rate = r1((byMode[m].PASS / byMode[m].total) * 100);
    if (Math.abs(rate - meta.summary_by_mode[m].pass_rate) > 0.05)
      throw new Error(`${f}: recomputed ${m} pass_rate ${rate} != meta ${meta.summary_by_mode[m].pass_rate}`);
  }

  // ---- aggregate ----
  // Only PASS counts toward a pass rate; both FAIL and CHEATING are non-passes.
  // Per source, split the rate by task type so the two are never blended together;
  // a mode is omitted (null) when the source has no tasks of that type.
  const modeStat = (pm) => (pm && pm.total > 0)
    ? { rate: r1((pm.pass / pm.total) * 100), pass: pm.pass, total: pm.total } : null;
  const perTask = Object.fromEntries(Object.entries(bySource).map(([src, s]) =>
    [slug(src), {
      rate: r1((s.pass / s.total) * 100), pass: s.pass, fail: s.fail + s.cheat, total: s.total,
      completion: modeStat(s.perMode["proof-completion"]),
      scratch: modeStat(s.perMode["proof-from-scratch"]),
    }]));

  // Attach the per-spec breakdown to the tlaplus/Examples task, ordered by size.
  const specSize = (sp) => (sp.perMode["proof-completion"]?.total ?? 0) + (sp.perMode["proof-from-scratch"]?.total ?? 0);
  const specs = Object.entries(bySpec)
    .map(([name, sp]) => ({
      id: slug(name), name, total: specSize(sp),
      completion: modeStat(sp.perMode["proof-completion"]),
      scratch: modeStat(sp.perMode["proof-from-scratch"]),
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const specTotal = specs.reduce((n, sp) => n + sp.total, 0);
  if (specTotal !== 505) throw new Error(`${f}: tlaplus/Examples specs sum to ${specTotal} != 505`);
  if (perTask["tlaplus-examples"]) perTask["tlaplus-examples"].specs = specs;

  const info = BACKEND_INFO[meta.backend] ?? { name: meta.backend, org: "?", logo: null, kind: "base" };
  return {
    id: meta.backend, ...info, generated: meta.generated,
    // Headline = unweighted mean of the two mode pass rates (weights both capabilities equally).
    score: r1(MODES.reduce((n, m) => n + (byMode[m].PASS / byMode[m].total) * 100, 0) / MODES.length),
    perMetric: {
      completion: r1((byMode["proof-completion"].PASS / byMode["proof-completion"].total) * 100),
      scratch: r1((byMode["proof-from-scratch"].PASS / byMode["proof-from-scratch"].total) * 100),
    },
    perTask,
  };
});

// Constituent specs behind the large tlaplus/Examples bucket, derived from the
// task set so the list stays in sync with results (identical across backends).
const anyFile = readdirSync("results").find((f) => f.endsWith(".json"));
const exGroups = new Map();
for (const r of JSON.parse(readFileSync(`results/${anyFile}`, "utf8")).results) {
  if (r.source !== "tlaplus/Examples") continue;
  const g = r.benchmark.split("/")[0].replace(/^tlaplus_examples_/, "");
  exGroups.set(g, (exGroups.get(g) ?? 0) + 1);
}
const tlaplusExamples = [...exGroups.entries()]
  .map(([name, n]) => ({ name, n }))
  .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
const exTotal = tlaplusExamples.reduce((a, e) => a + e.n, 0);
if (exTotal !== 505) throw new Error(`tlaplus/Examples specs sum to ${exTotal} != 505`);

// Attach the derived spec list to the tlaplus/Examples source card.
const sources = SITE.sources.map((s) =>
  s.id === "tlaplus-examples" ? { ...s, examples: tlaplusExamples } : s);

const data = {
  paper: SITE.paper,
  metrics: [
    { id: "completion", name: "--mode proof-completion",  blurb: "Pass rate on the 483 proof-completion tasks.",
      tip: "The full proof scaffolding is provided — inductive invariants, lemma decomposition, and preceding lemmas — and the model fills in one target proof." },
    { id: "scratch",    name: "--mode proof-from-scratch", blurb: "Pass rate on the 231 proof-from-scratch tasks.",
      tip: "Only the model and the target theorem statement remain; the model must invent the entire proof structure, including any helper lemmas." },
  ],
  // Leaderboard per-source expand: slug ids match perTask keys; n = tasks across both modes.
  tasks: Object.entries(CANONICAL).map(([name, [pc, pfs]]) => ({ id: slug(name), name: DISPLAY_NAME[name] ?? name, n: pc + pfs })),
  models: models.sort((a, b) => b.score - a.score),
  // Preserved page content (Benchmark task-type cards + source cards, Cite).
  modes: SITE.modes,
  sources,
  coverage: SITE.coverage,
  bibtex: SITE.bibtex,
};

writeFileSync("data.js",
  "// GENERATED by scripts/build-data.mjs - do not edit by hand.\n" +
  "// Leaderboard (metrics/tasks/models) is recomputed from results/*.json;\n" +
  "// page content (paper/modes/sources/bibtex) comes from scripts/site-content.mjs.\n" +
  "window.TLAPS_DATA = " + JSON.stringify(data, null, 2) + ";\n");
console.log(`Wrote data.js: ${models.length} model(s), ${data.tasks.length} sources.`);
