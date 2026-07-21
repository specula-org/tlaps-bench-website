// Turn results/<backend>.json files into data.js (window.TLAPS_DATA).
// Deterministic and total: same inputs -> same output; anything suspicious -> throw.
// All validation lives here so the UI can assume complete, trustworthy data.
//
//   node scripts/build-data.mjs
//
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { SITE } from "./site-content.mjs";

const MODES = ["proof-completion", "proof-from-scratch"];

// Canonical manifest: per-source totals [proof-completion, proof-from-scratch].
// These keys deliberately match results[].source; reader-facing names live in
// SOURCE_INFO below. Update only when the benchmark version changes.
const CANONICAL = {
  "tlaplus/Examples": [379, 126],
  "TLAPS distribution examples": [103, 57],
  "ZooKeeper (Remix)": [0, 18],
  "Ivy liveness": [0, 12],
  "etcd (Specula)": [0, 8],
  "OpenAddressing (lemmy/Examples)": [1, 5],
  "Anvil": [0, 1],
};
const RECORDS = 710;
const SPECS = 70;

// The one hand-maintained table: display info per backend id.
// name = the underlying model (primary label); subname = the agent/endpoint, shown below it.
const BACKEND_INFO = {
  copilot: { name: "Opus-4.8", subname: "GitHub Copilot", org: "GitHub", logo: null, kind: "agent" },
  "copilot-gemini-3.1-pro-preview": { name: "Gemini 3.1 Pro Preview", subname: "GitHub Copilot", org: "GitHub", logo: null, kind: "agent" },
  codex: { name: "GPT-5.5", subname: "OpenAI Codex", org: "OpenAI", logo: null, kind: "agent" },
};

// A reproducible output-only estimate, not the experiments' actual bill. The
// archived Copilot CLI events expose output tokens but not input/cache usage, so
// every backend uses a fixed public standard-tier output rate from the same
// audit date. Long-context tiers cannot be inferred without per-request input.
const OUTPUT_PRICING = {
  codex: {
    usdPerMillionTokens: 30,
    tier: "standard",
    asOf: "2026-07-18",
    source: "https://developers.openai.com/api/docs/models/gpt-5.5",
  },
  copilot: {
    usdPerMillionTokens: 25,
    tier: "standard",
    asOf: "2026-07-18",
    source: "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
  },
  "copilot-gemini-3.1-pro-preview": {
    usdPerMillionTokens: 12,
    tier: "standard (up to 200K input tokens)",
    asOf: "2026-07-18",
    source: "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
  },
};

// Upstream provenance per source. The canonical result keys are kept separate
// from their reader-facing labels so old result bundles remain reproducible.
// The URLs mirror scripts/dataset_table.py in the benchmark repository.
const SOURCE_INFO = {
  "tlaplus/Examples": {
    name: "tlaplus/Examples",
    url: "https://github.com/tlaplus/Examples",
  },
  "TLAPS distribution examples": {
    name: "TLAPS distribution examples",
    url: "https://github.com/tlaplus/tlapm",
  },
  "ZooKeeper (Remix)": {
    name: "ZooKeeper (Remix)",
    url: "https://arxiv.org/abs/2409.14301",
  },
  "Ivy liveness": {
    name: "Ivy liveness",
    url: "https://github.com/kenmcmil/ivy",
  },
  "etcd (Specula)": {
    name: "etcd (Specula)",
    url: "https://github.com/specula-org",
  },
  "OpenAddressing (lemmy/Examples)": {
    name: "OpenAddressing",
    url: "https://github.com/lemmy/Examples",
  },
  // The benchmark PR renamed this spec and source after the published result
  // bundles were produced. Keep the old keys internally, but present the new name.
  Anvil: {
    name: "two_thread_mutex",
    url: "https://github.com/anvil-verifier/anvil",
  },
};

const LIBRARY_SOURCES = new Set(["tlaplus/Examples", "TLAPS distribution examples"]);
const categoryFor = (source) => LIBRARY_SOURCES.has(source) ? "libraries" : "systems";
const sourceSize = (source) => CANONICAL[source][0] + CANONICAL[source][1];

const TLAPLUS_REPO = "https://github.com/tlaplus/Examples/tree/master/specifications";
const TLAPM_REPO = "https://github.com/tlaplus/tlapm";
const TLAPM_FILES = new Set([
  "Allocator", "Bakery", "BubbleSort", "EWD840", "Peterson", "SimpleMutex", "SumAndMax",
]);
const TLAPM_DIRS = { Cantor: "examples/cantor" };

// Per-spec locations verified against their upstream repositories. Entries
// not listed here are handled by the corpus-specific rules in specUrl().
const SPEC_URL = {
  Consensus: "https://github.com/tlaplus/tlapm/tree/main/examples_draft/consensus",
  Data: "https://github.com/tlaplus/tlapm/tree/main/zenon/regression/examples/data",
  Paxos: "https://github.com/hengxin/tlaps-examples/tree/master/Paxos",
  Euclid: "https://github.com/hengxin/tlaps-examples/tree/master/Euclid",
  AtomicBakery: "https://github.com/hengxin/tlaps-examples/tree/master/AtomicBakery",
  Record: "https://github.com/hengxin/tlaps-examples/tree/master/Record",
  etcd_raft: "https://github.com/specula-org/Specula/blob/main/skills/spec_generation/examples/etcdraft.tla",
  OpenAddressing: "https://github.com/lemmy/Examples/tree/mku-OA/specifications/TLC",
  ZooKeeper: "https://github.com/Disalg-ICS-NJU/zookeeper-tla-spec/blob/main/high-level-spec/Zab.tla",
  ZooKeeper_LowLevel: "https://github.com/Disalg-ICS-NJU/zookeeper-tla-spec/tree/main/low-level-spec/zk-3.7",
  tlaplus_examples_BlockingQueue: "https://github.com/lemmy/BlockingQueue",
  tlaplus_examples_GermanProtocol: "https://github.com/tlaplus/Examples/blob/aba0cef20ce694f97612ad36a873734a1314534a/specifications/GermanProtocol/GermanCoherence.tla",
  two_thread_mutex: "https://github.com/anvil-verifier/anvil/blob/main/src/tla_demo.rs",
  // Compatibility with result bundles created before the benchmark rename.
  AnvilLock: "https://github.com/anvil-verifier/anvil/blob/main/src/tla_demo.rs",
};

const displayName = (group) => {
  if (group === "AnvilLock") return "two_thread_mutex";
  for (const prefix of ["tlaplus_examples_", "ivy_examples_"]) {
    if (group.startsWith(prefix)) return group.slice(prefix.length);
  }
  return group;
};

const specUrl = (group) => {
  if (SPEC_URL[group]) return SPEC_URL[group];
  if (group.startsWith("ivy_examples_")) {
    const name = group.slice("ivy_examples_".length);
    return `https://github.com/kenmcmil/ivy/blob/master/examples/liveness/${name}.ivy`;
  }
  if (group.startsWith("tlaplus_examples_")) {
    const name = group.slice("tlaplus_examples_".length);
    if (name.startsWith("SpecifyingSystems_")) {
      const chapter = name.slice("SpecifyingSystems_".length);
      return `${TLAPLUS_REPO}/SpecifyingSystems/${chapter}`;
    }
    return `${TLAPLUS_REPO}/${name}`;
  }
  if (TLAPM_FILES.has(group)) return `${TLAPM_REPO}/blob/main/examples/${group}.tla`;
  if (TLAPM_DIRS[group]) return `${TLAPM_REPO}/tree/main/${TLAPM_DIRS[group]}`;
  return null;
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const specId = (source, group) => `${slug(source)}--${slug(group)}`;
const specKey = (source, group) => JSON.stringify([source, group]);
const r1 = (x) => Math.round(x * 10) / 10;
const modeStat = (pm, usdPerMillionTokens) => {
  if (!pm || pm.total <= 0) return null;
  const outputCostUsd = pm.outputTokens * usdPerMillionTokens / 1_000_000;
  return {
    rate: r1((pm.pass / pm.total) * 100),
    pass: pm.pass,
    total: pm.total,
    taskCount: pm.total,
    activeTimeSecs: pm.activeTimeSecs,
    activeTimePerTask: pm.activeTimeSecs / pm.total,
    outputTokens: pm.outputTokens,
    outputTokensPerTask: pm.outputTokens / pm.total,
    outputCostUsd,
    outputCostPerTask: outputCostUsd / pm.total,
  };
};

let canonicalSpecs = null;
let canonicalSpecManifest = null;
let canonicalTaskManifest = null;

const resultFiles = readdirSync("results").filter((f) => f.endsWith(".json")).sort();
if (resultFiles.length === 0) throw new Error("results/: no backend JSON files found");

const models = resultFiles.map((f) => {
  const resultText = readFileSync(`results/${f}`, "utf8");
  const { meta, results } = JSON.parse(resultText);
  const resultsVersion = createHash("sha256").update(resultText).digest("hex").slice(0, 12);

  // ---- validate: recompute from results[], check against canon and meta ----
  if (results.length !== RECORDS) throw new Error(`${f}: ${results.length} records != ${RECORDS}`);
  const byMode = {};
  const bySource = {};
  const bySpec = {};
  let activeTimeSecs = 0;
  let outputTokens = 0;
  for (const r of results) {
    if (!["PASS", "FAIL", "CHEATING"].includes(r.check_verdict)) {
      throw new Error(`${f}: ${r.benchmark} [${r.mode}] has infra verdict ${r.check_verdict} - re-run before publishing`);
    }
    if (!MODES.includes(r.mode)) throw new Error(`${f}: ${r.benchmark} has unknown mode "${r.mode}"`);
    if (!CANONICAL[r.source]) throw new Error(`${f}: unknown source "${r.source}"`);
    if (!Number.isFinite(r.time_secs) || r.time_secs <= 0) {
      throw new Error(`${f}: ${r.benchmark} has invalid time_secs ${r.time_secs}`);
    }
    if (!Number.isInteger(r.output_tokens) || r.output_tokens <= 0) {
      throw new Error(`${f}: ${r.benchmark} has invalid output_tokens ${r.output_tokens}`);
    }

    activeTimeSecs += r.time_secs;
    outputTokens += r.output_tokens;

    const group = r.benchmark.split("/")[0];
    if (!group || group === r.benchmark) {
      throw new Error(`${f}: benchmark "${r.benchmark}" does not identify a spec group`);
    }

    const m = (byMode[r.mode] ??= {
      total: 0,
      PASS: 0,
      CHEATING: 0,
      activeTimeSecs: 0,
      outputTokens: 0,
    });
    m.total++;
    m[r.check_verdict] = (m[r.check_verdict] ?? 0) + 1;
    m.activeTimeSecs += r.time_secs;
    m.outputTokens += r.output_tokens;

    const s = (bySource[r.source] ??= { perMode: {} });
    const spm = (s.perMode[r.mode] ??= { total: 0 });
    spm.total++;

    const key = specKey(r.source, group);
    const spec = (bySpec[key] ??= { source: r.source, group, perMode: {} });
    const specMode = (spec.perMode[r.mode] ??= {
      pass: 0,
      total: 0,
      activeTimeSecs: 0,
      outputTokens: 0,
    });
    specMode.total++;
    if (r.check_verdict === "PASS") specMode.pass++;
    specMode.activeTimeSecs += r.time_secs;
    specMode.outputTokens += r.output_tokens;
  }

  const usageAudit = meta.usage_audit;
  if (!usageAudit || usageAudit.task_count !== RECORDS ||
      usageAudit.active_time_complete !== true || usageAudit.output_tokens_audited !== true) {
    throw new Error(`${f}: missing audited ${RECORDS}-task usage data`);
  }
  const pricing = OUTPUT_PRICING[meta.backend];
  if (!pricing || !Number.isFinite(pricing.usdPerMillionTokens) || pricing.usdPerMillionTokens <= 0) {
    throw new Error(`${f}: missing valid output pricing for ${meta.backend}`);
  }
  if (pricing.asOf !== usageAudit.date) {
    throw new Error(`${f}: pricing date ${pricing.asOf} does not match usage audit ${usageAudit.date}`);
  }

  for (const [source, [completion, scratch]] of Object.entries(CANONICAL)) {
    const got = bySource[source]?.perMode ?? {};
    if ((got["proof-completion"]?.total ?? 0) !== completion ||
        (got["proof-from-scratch"]?.total ?? 0) !== scratch) {
      throw new Error(`${f}: ${source} counts don't match the canonical manifest`);
    }
  }
  for (const mode of MODES) {
    if (!byMode[mode]) throw new Error(`${f}: no records for ${mode}`);
    const rate = r1((byMode[mode].PASS / byMode[mode].total) * 100);
    if (Math.abs(rate - meta.summary_by_mode[mode].pass_rate) > 0.05) {
      throw new Error(`${f}: recomputed ${mode} pass_rate ${rate} != meta ${meta.summary_by_mode[mode].pass_rate}`);
    }
  }

  // A model's result file also acts as a complete spec manifest. Compare the
  // source, raw group, and both mode counts so per-spec rows cannot silently
  // drift between backends while preserving the same 710-record total.
  const manifest = Object.values(bySpec)
    .map((spec) => ({
      source: spec.source,
      group: spec.group,
      completion: spec.perMode["proof-completion"]?.total ?? 0,
      scratch: spec.perMode["proof-from-scratch"]?.total ?? 0,
    }))
    .sort((a, b) => a.source.localeCompare(b.source) || a.group.localeCompare(b.group));
  if (manifest.length !== SPECS) throw new Error(`${f}: ${manifest.length} specs != ${SPECS}`);
  const serializedManifest = JSON.stringify(manifest);
  if (canonicalSpecManifest === null) {
    canonicalSpecManifest = serializedManifest;
  } else if (serializedManifest !== canonicalSpecManifest) {
    throw new Error(`${f}: per-spec manifest differs from ${resultFiles[0]}`);
  }

  const taskManifest = results
    .map((r) => ({ mode: r.mode, benchmark: r.benchmark, theorem: r.theorem, source: r.source }))
    .sort((a, b) => a.mode.localeCompare(b.mode) || a.benchmark.localeCompare(b.benchmark));
  const taskIds = new Set(taskManifest.map((r) => `${r.mode}\n${r.benchmark}`));
  if (taskIds.size !== RECORDS) throw new Error(`${f}: task identities are not unique`);
  const serializedTaskManifest = JSON.stringify(taskManifest);
  if (canonicalTaskManifest === null) {
    canonicalTaskManifest = serializedTaskManifest;
  } else if (serializedTaskManifest !== canonicalTaskManifest) {
    throw new Error(`${f}: task manifest differs from ${resultFiles[0]}`);
  }

  const rows = manifest.map(({ source, group, completion, scratch }) => {
    const sourceInfo = SOURCE_INFO[source];
    if (!sourceInfo) throw new Error(`${f}: missing display info for source "${source}"`);
    return {
      id: specId(source, group),
      group,
      name: displayName(group),
      category: categoryFor(source),
      sourceKey: source,
      sourceName: sourceInfo.name,
      sourceUrl: sourceInfo.url,
      url: specUrl(group),
      completion,
      scratch,
      total: completion + scratch,
    };
  });

  // Slug-based ids stay readable in the generated data; fail loudly if two raw
  // source/group pairs ever normalize to the same id.
  const ids = new Set(rows.map((row) => row.id));
  if (ids.size !== rows.length) throw new Error(`${f}: spec ids are not unique`);
  for (const row of rows) {
    if (!row.url) {
      throw new Error(`${f}: spec "${row.group}" is missing an upstream URL`);
    }
  }

  if (canonicalSpecs === null) {
    canonicalSpecs = rows.sort((a, b) =>
      (a.category === b.category ? 0 : a.category === "libraries" ? -1 : 1) ||
      sourceSize(b.sourceKey) - sourceSize(a.sourceKey) ||
      a.sourceName.localeCompare(b.sourceName) || b.total - a.total || a.name.localeCompare(b.name));
  }

  const perSpec = Object.fromEntries(manifest.map(({ source, group }) => {
    const spec = bySpec[specKey(source, group)];
    return [
      specId(source, group),
      {
        completion: modeStat(spec.perMode["proof-completion"], pricing.usdPerMillionTokens),
        scratch: modeStat(spec.perMode["proof-from-scratch"], pricing.usdPerMillionTokens),
      },
    ];
  }));

  const info = BACKEND_INFO[meta.backend] ?? { name: meta.backend, org: "?", logo: null, kind: "base" };
  const perMode = {
    completion: modeStat({
      ...byMode["proof-completion"],
      pass: byMode["proof-completion"].PASS,
    }, pricing.usdPerMillionTokens),
    scratch: modeStat({
      ...byMode["proof-from-scratch"],
      pass: byMode["proof-from-scratch"].PASS,
    }, pricing.usdPerMillionTokens),
  };
  const outputCostUsd = outputTokens * pricing.usdPerMillionTokens / 1_000_000;
  return {
    id: meta.backend,
    ...info,
    generated: meta.generated,
    resultsFile: `results/${f}`,
    resultsVersion,
    perMetric: {
      completion: perMode.completion.rate,
      scratch: perMode.scratch.rate,
      activeTimePerTask: activeTimeSecs / RECORDS,
      outputCostPerTask: outputCostUsd / RECORDS,
    },
    perMode,
    usage: {
      taskCount: RECORDS,
      activeTimeSecs,
      outputTokens,
      outputCostUsd,
    },
    pricing,
    perSpec,
  };
});

const categoryStats = Object.fromEntries(SITE.categories.map((category) => [category.id, {
  specCount: 0,
  completion: 0,
  scratch: 0,
  total: 0,
}]));
for (const spec of canonicalSpecs) {
  const stats = categoryStats[spec.category];
  if (!stats) throw new Error(`spec ${spec.id}: unknown category "${spec.category}"`);
  stats.specCount++;
  stats.completion += spec.completion;
  stats.scratch += spec.scratch;
  stats.total += spec.total;
}
const categories = SITE.categories.map((category) => ({ ...category, ...categoryStats[category.id] }));
if (categories.reduce((n, category) => n + category.specCount, 0) !== SPECS ||
    categories.reduce((n, category) => n + category.total, 0) !== RECORDS) {
  throw new Error("category totals do not cover the canonical spec manifest");
}

const data = {
  paper: SITE.paper,
  metrics: [
    { id: "completion", name: "--mode proof-completion", blurb: "Pass rate on the 483 proof-completion properties.",
      tip: "The full proof scaffolding is provided, including inductive invariants, lemma decomposition, and preceding lemmas, and the model fills in one target proof." },
    { id: "scratch", name: "--mode proof-from-scratch", blurb: "Pass rate on the 227 proof-from-scratch properties.",
      tip: "Only the model and the target theorem statement remain; the model must invent the entire proof structure, including any helper lemmas." },
    { id: "activeTimePerTask", name: "Active time / task", invert: true, format: "duration", breakdown: false, groupStart: true, bar: false,
      tip: "Mean active agent time per task in the selected mode. The secondary value is that mode's sum of task time; parallel tasks overlap, so it is not experiment wall-clock time. Lower is better." },
    { id: "outputCostPerTask", name: "Output-only cost / task", invert: true, format: "usd", breakdown: false, bar: false,
      tip: "Mean estimated output-only cost per task in the selected mode, using reported output tokens and a fixed public standard-tier output rate as of July 18, 2026. Long-context tiers are not inferred. The secondary value is that mode's total. Lower is better." },
  ],
  categories,
  specs: canonicalSpecs,
  // Initial order matches the leaderboard's default sort. The two modes remain
  // separate; there is deliberately no hidden blended headline score.
  models: models.sort((a, b) => b.perMetric.completion - a.perMetric.completion),
  modes: SITE.modes,
  coverage: SITE.coverage,
  bibtex: SITE.bibtex,
};

if (process.argv.includes("--check")) {
  console.log(`Validated: ${models.length} model(s), ${data.specs.length} specs, ${RECORDS} properties.`);
} else {
  writeFileSync("data.js",
    "// GENERATED by scripts/build-data.mjs - do not edit by hand.\n" +
    "// Leaderboard data is recomputed from results/*.json;\n" +
    "// page content comes from scripts/site-content.mjs.\n" +
    "window.TLAPS_DATA = " + JSON.stringify(data, null, 2) + ";\n");
  console.log(`Wrote data.js: ${models.length} model(s), ${data.specs.length} specs.`);
}
