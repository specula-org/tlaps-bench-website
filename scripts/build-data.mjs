// Turn results/<backend>.json files into data.js (window.TLAPS_DATA).
// Deterministic and total: same inputs -> same output; anything suspicious -> throw.
//
// The published site is Proof Completion Core only: every model must cover the
// exact task list in results/core-manifest.json. Regenerate that list with
// scripts/sync-core-manifest.mjs when the Core changes.
//
//   node scripts/build-data.mjs
//   node scripts/build-data.mjs --check
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { SITE } from "./site-content.mjs";

const MODE = "proof-completion";
const MODE_KEY = "completion";

const coreManifest = JSON.parse(readFileSync("results/core-manifest.json", "utf8"));
if (coreManifest.suite !== "proof-completion-core" || coreManifest.mode !== MODE) {
  throw new Error("results/core-manifest.json: expected Proof Completion Core");
}
if (!Array.isArray(coreManifest.tasks) || coreManifest.tasks.length === 0) {
  throw new Error("results/core-manifest.json: empty tasks[]");
}
const CORE_TASKS = [...coreManifest.tasks]
  .sort((a, b) => a.benchmark.localeCompare(b.benchmark));
const CORE_COUNT = CORE_TASKS.length;
if (coreManifest.task_count !== CORE_COUNT) {
  throw new Error(`results/core-manifest.json: task_count ${coreManifest.task_count} != ${CORE_COUNT}`);
}
for (const t of CORE_TASKS) {
  if (typeof t.spec_id !== "string" || !t.spec_id.endsWith(".tla")) {
    throw new Error(`results/core-manifest.json: ${t.benchmark} missing originating spec_id`);
  }
}
const CORE_BY_BENCHMARK = new Map(CORE_TASKS.map((t) => [t.benchmark, t]));
if (CORE_BY_BENCHMARK.size !== CORE_COUNT) {
  throw new Error("results/core-manifest.json: duplicate benchmarks");
}
const CORE_SPEC_COUNT = new Set(CORE_TASKS.map((t) => t.spec_id)).size;
const CANONICAL = Object.fromEntries(
  Object.entries(coreManifest.sources ?? {}).map(([source, n]) => [source, n]),
);
if (Object.values(CANONICAL).reduce((a, b) => a + b, 0) !== CORE_COUNT) {
  throw new Error("results/core-manifest.json: sources do not sum to task_count");
}

// name = underlying model; subname = harness/endpoint shown below it.
// kind "base" = one-shot; kind "agent" = agentic. meta.cohort / meta.approach win.
const BACKEND_INFO = {
  "codex-gpt-5.6-sol": {
    name: "GPT-5.6-Sol",
    subname: "OpenAI Codex (xhigh)",
    org: "OpenAI",
    logo: null,
    kind: "agent",
  },
  "codex-gpt-5.6-terra": {
    name: "GPT-5.6-Terra",
    subname: "OpenAI Codex (xhigh)",
    org: "OpenAI",
    logo: null,
    kind: "agent",
  },
  "codex-gpt-5.6-luna": {
    name: "GPT-5.6-Luna",
    subname: "OpenAI Codex (xhigh)",
    org: "OpenAI",
    logo: null,
    kind: "agent",
  },
  "codex-single-turn-gpt-5.6-sol": {
    name: "GPT-5.6-Sol",
    subname: "OpenAI Codex (medium)",
    org: "OpenAI",
    logo: null,
    kind: "base",
  },
  "codex-single-turn-gpt-5.6-sol-xhigh": {
    name: "GPT-5.6-Sol",
    subname: "OpenAI Codex (xhigh)",
    org: "OpenAI",
    logo: null,
    kind: "base",
  },
  "codex-single-turn-gpt-5.6-sol-max": {
    name: "GPT-5.6-Sol",
    subname: "OpenAI Codex (max)",
    org: "OpenAI",
    logo: null,
    kind: "base",
  },
  "codex-single-turn-gpt-5.6-luna": {
    name: "GPT-5.6-Luna",
    subname: "OpenAI Codex (xhigh)",
    org: "OpenAI",
    logo: null,
    kind: "base",
  },
  "codex-single-turn-gpt-5.6-terra": {
    name: "GPT-5.6-Terra",
    subname: "OpenAI Codex (xhigh)",
    org: "OpenAI",
    logo: null,
    kind: "base",
  },
};

// Only these backends appear on the live site.
const PUBLISHED_BACKENDS = new Set([
  "codex-gpt-5.6-sol",
  "codex-gpt-5.6-terra",
  "codex-gpt-5.6-luna",
  "codex-single-turn-gpt-5.6-sol",
  "codex-single-turn-gpt-5.6-sol-xhigh",
  "codex-single-turn-gpt-5.6-sol-max",
  "codex-single-turn-gpt-5.6-luna",
  "codex-single-turn-gpt-5.6-terra",
]);

const COHORT_FROM_KIND = { base: "one-shot", agent: "agentic" };
const COHORT_LABEL = { "one-shot": "One-Shot", agentic: "Agentic" };
const resolveCohort = (meta, info) => {
  if (meta.cohort === "agentic" || meta.cohort === "one-shot") return meta.cohort;
  if (meta.approach === "agentic" || meta.approach === "agent") return "agentic";
  if (meta.approach === "one-shot" || meta.approach === "oneshot" || meta.approach === "base" ||
      meta.approach === "single_turn_tool_free" || meta.approach === "single_turn") {
    return "one-shot";
  }
  return COHORT_FROM_KIND[info.kind] ?? "one-shot";
};

const PRICE_SOURCE_BY_MODEL = {
  "gpt-5.6-sol": "https://developers.openai.com/api/docs/models/gpt-5.6-sol",
  "gpt-5.6-terra": "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
  "gpt-5.6-luna": "https://developers.openai.com/api/docs/models/gpt-5.6-luna",
};

const SOURCE_INFO = {
  "tlaplus/Examples": {
    name: "tlaplus/Examples",
    url: "https://github.com/tlaplus/Examples",
  },
  "TLAPS distribution examples": {
    name: "TLAPS distribution examples",
    url: "https://github.com/tlaplus/tlapm",
  },
  "apalache-examples (Konnov)": {
    name: "apalache-examples (Konnov)",
    url: "https://github.com/konnov/apalache-examples",
  },
};

const LIBRARY_SOURCES = new Set([
  "tlaplus/Examples",
  "TLAPS distribution examples",
  "apalache-examples (Konnov)",
]);
const categoryFor = (source) => LIBRARY_SOURCES.has(source) ? "libraries" : "systems";
const sourceSize = (source) => CANONICAL[source] ?? 0;

const TLAPLUS_REPO = "https://github.com/tlaplus/Examples/tree/master/specifications";
const TLAPM_REPO = "https://github.com/tlaplus/tlapm";
const TLAPM_FILES = new Set([
  "Allocator", "Bakery", "BubbleSort", "EWD840", "Peterson", "SimpleMutex", "SumAndMax",
]);
const TLAPM_DIRS = { Cantor: "examples/cantor" };

const SPEC_URL = {
  Consensus: "https://github.com/tlaplus/tlapm/tree/main/examples_draft/consensus",
  Data: "https://github.com/tlaplus/tlapm/tree/main/zenon/regression/examples/data",
  Paxos: "https://github.com/hengxin/tlaps-examples/tree/master/Paxos",
  Euclid: "https://github.com/hengxin/tlaps-examples/tree/master/Euclid",
  AtomicBakery: "https://github.com/hengxin/tlaps-examples/tree/master/AtomicBakery",
  tlaplus_examples_BlockingQueue: "https://github.com/lemmy/BlockingQueue",
  "apalache_examples_ben-or83": "https://github.com/konnov/apalache-examples/tree/main/ben-or83",
  apalache_examples_tendermint: "https://github.com/konnov/apalache-examples/tree/main/tendermint-accountability",
};

const exampleDir = (benchmarkOrSpecId) => benchmarkOrSpecId.split("/")[0];
const sourceSpecName = (specSourceId) =>
  specSourceId.split("/").pop().replace(/\.tla$/i, "");

const displayName = (group) => {
  for (const prefix of ["tlaplus_examples_", "apalache_examples_"]) {
    if (group.startsWith(prefix)) return group.slice(prefix.length);
  }
  return group;
};

const specUrl = (group) => {
  if (SPEC_URL[group]) return SPEC_URL[group];
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
const specId = (source, scoringKey) => `${slug(source)}--${slug(scoringKey)}`;
const specKey = (source, scoringKey) => JSON.stringify([source, scoringKey]);
const r1 = (x) => Math.round(x * 10) / 10;
const sameNumber = (actual, expected) =>
  Number.isFinite(actual) && Math.abs(actual - expected) < 1e-9;

const modeStat = (pm) => {
  if (!pm || pm.total <= 0) return null;
  const cacheRatePct = pm.inputTokens > 0
    ? 100 * pm.cacheReadInputTokens / pm.inputTokens
    : null;
  return {
    rate: r1((pm.pass / pm.total) * 100),
    pass: pm.pass,
    total: pm.total,
    canonicalTotal: pm.total,
    partialScope: false,
    taskCount: pm.total,
    activeTimeSecs: pm.activeTimeSecs,
    activeTimePerTask: pm.activeTimeSecs / pm.total,
    inputTokens: pm.inputTokens,
    outputTokens: pm.outputTokens,
    totalTokens: pm.inputTokens + pm.outputTokens,
    totalTokensPerTask: (pm.inputTokens + pm.outputTokens) / pm.total,
    cacheReadInputTokens: pm.cacheReadInputTokens,
    cacheWriteInputTokens: pm.cacheWriteInputTokens,
    cacheRatePct,
    equivalentCostUsd: pm.equivalentCostUsd,
    equivalentCostPerTask: pm.equivalentCostUsd / pm.total,
  };
};

const serializeTaskManifest = (rows) => JSON.stringify(
  [...rows]
    .map((r) => ({
      mode: MODE,
      benchmark: r.benchmark,
      theorem: r.theorem,
      source: r.source,
    }))
    .sort((a, b) => a.benchmark.localeCompare(b.benchmark)),
);
const canonicalTaskManifest = serializeTaskManifest(CORE_TASKS);

// Complexity bands prefer per-result gt_proof_steps when present; core-complexity.json
// is the fallback catalog for tasks that omit them.
const complexityByTask = new Map();
const complexityCatalog = JSON.parse(readFileSync("results/core-complexity.json", "utf8"));
for (const [benchmark, steps] of Object.entries(complexityCatalog.steps ?? {})) {
  if (!Number.isInteger(steps) || steps < 0) {
    throw new Error(`results/core-complexity.json: invalid steps for ${benchmark}`);
  }
  if (!CORE_BY_BENCHMARK.has(benchmark)) {
    throw new Error(`results/core-complexity.json: ${benchmark} is not in Core`);
  }
  complexityByTask.set(benchmark, steps);
}

const COMPLEXITY_BANDS = [
  { id: "d0", label: "0", min: 0, max: 0, note: "reference proof is a single step" },
  { id: "d1", label: "1–4", min: 1, max: 4 },
  { id: "d2", label: "5–12", min: 5, max: 12 },
  { id: "d3", label: "13–30", min: 13, max: 30 },
  { id: "d4", label: "31–50", min: 31, max: 50 },
  { id: "d5", label: "51–100", min: 51, max: 100 },
  { id: "d6", label: "101+", min: 101, max: Infinity },
];
const EMPTY_BAND = { rate: null, pass: 0, total: 0 };
const bandFor = (steps) => COMPLEXITY_BANDS.find((b) => steps >= b.min && steps <= b.max);

const resultFiles = readdirSync("results")
  .filter((f) => f.endsWith(".json") && !["core-manifest.json", "full-suite-catalog.json", "core-complexity.json"].includes(f))
  .sort();
if (resultFiles.length === 0) throw new Error("results/: no backend JSON files found");

const bundles = resultFiles.flatMap((f) => {
  const resultText = readFileSync(`results/${f}`, "utf8");
  const { meta, results } = JSON.parse(resultText);
  if (!meta?.backend) throw new Error(`${f}: meta.backend is required`);
  if (!PUBLISHED_BACKENDS.has(meta.backend)) return [];
  if (!Array.isArray(results) || results.length === 0) throw new Error(`${f}: no results[]`);
  return [{
    f, meta, results,
    resultsVersion: createHash("sha256").update(resultText).digest("hex").slice(0, 12),
  }];
});
if (bundles.length === 0) throw new Error("results/: no published backend JSON files found");
const publishedMissing = [...PUBLISHED_BACKENDS].filter(
  (id) => !bundles.some((b) => b.meta.backend === id),
);
if (publishedMissing.length > 0) {
  throw new Error(`results/: published backend(s) missing: ${publishedMissing.join(", ")}`);
}

for (const { f, results } of bundles) {
  for (const r of results) {
    if (!Number.isInteger(r.gt_proof_steps)) continue;
    if (r.gt_proof_steps < 0) throw new Error(`${f}: ${r.benchmark} has negative gt_proof_steps`);
    const seen = complexityByTask.get(r.benchmark);
    if (seen !== undefined && seen !== r.gt_proof_steps) {
      throw new Error(`${f}: ${r.benchmark} reference-proof steps ${r.gt_proof_steps} != ${seen}`);
    }
    complexityByTask.set(r.benchmark, r.gt_proof_steps);
  }
}

const models = bundles.map(({ f, meta, results, resultsVersion }) => {
  const usageAudit = meta.usage_audit;
  if (!usageAudit || usageAudit.task_count !== results.length ||
      usageAudit.complete_for_all_tasks !== true || usageAudit.active_time_complete !== true) {
    throw new Error(`${f}: missing audited ${results.length}-task usage data`);
  }
  const priceSource = PRICE_SOURCE_BY_MODEL[meta.model];
  if (!priceSource) {
    throw new Error(`${f}: no public pricing source for ${meta.model}`);
  }

  if (results.length !== CORE_COUNT) {
    throw new Error(`${f}: ${results.length} records != Core ${CORE_COUNT}`);
  }
  if (meta.canonical_scope?.["proof-completion"] != null &&
      meta.canonical_scope["proof-completion"] !== CORE_COUNT) {
    throw new Error(`${f}: meta.canonical_scope.proof-completion != Core ${CORE_COUNT}`);
  }
  if (meta.manifest_exception) {
    throw new Error(`${f}: manifest_exception is not allowed; publish only full Core bundles`);
  }

  const bySource = {};
  const bySpec = {};
  const byBand = {};
  let activeTimeSecs = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadInputTokens = 0;
  let cacheWriteInputTokens = 0;
  let equivalentCostUsd = 0;
  let pass = 0;
  let cheating = 0;
  let modeActive = 0;
  let modeInput = 0;
  let modeOutput = 0;
  let modeCacheRead = 0;
  let modeCacheWrite = 0;
  let modeEquivalentCost = 0;

  for (const r of results) {
    if (!["PASS", "FAIL", "CHEATING"].includes(r.check_verdict)) {
      throw new Error(`${f}: ${r.benchmark} has infra verdict ${r.check_verdict}`);
    }
    if (r.mode !== MODE) throw new Error(`${f}: ${r.benchmark} has mode "${r.mode}"`);
    if (!CANONICAL[r.source]) throw new Error(`${f}: unknown source "${r.source}"`);
    const expected = CORE_BY_BENCHMARK.get(r.benchmark);
    if (!expected) throw new Error(`${f}: task not in Core: ${r.benchmark}`);
    if (r.source !== expected.source) {
      throw new Error(`${f}: ${r.benchmark} source ${r.source} != Core ${expected.source}`);
    }
    if (r.theorem !== expected.theorem) {
      throw new Error(`${f}: ${r.benchmark} theorem differs from Core manifest`);
    }
    if (!Number.isFinite(r.time_secs) || r.time_secs <= 0) {
      throw new Error(`${f}: ${r.benchmark} has invalid time_secs ${r.time_secs}`);
    }
    // TIMEOUT failures may have audited-unavailable usage (0 tokens / $0). Every other
    // Core row still needs complete positive token and cost data.
    const usageUnavailableTimeout =
      r.termination_reason === "TIMEOUT" &&
      r.check_verdict === "FAIL" &&
      r.input_tokens === 0 &&
      r.output_tokens === 0 &&
      r.cache_read_input_tokens === 0 &&
      r.cache_write_input_tokens === 0 &&
      r.equivalent_cost_usd === 0;
    if (!usageUnavailableTimeout) {
      if (!Number.isInteger(r.input_tokens) || r.input_tokens <= 0) {
        throw new Error(`${f}: ${r.benchmark} has invalid input_tokens ${r.input_tokens}`);
      }
      if (!Number.isInteger(r.output_tokens) || r.output_tokens <= 0) {
        throw new Error(`${f}: ${r.benchmark} has invalid output_tokens ${r.output_tokens}`);
      }
    } else if (!Number.isInteger(r.input_tokens) || !Number.isInteger(r.output_tokens)) {
      throw new Error(`${f}: ${r.benchmark} has non-integer timeout usage placeholders`);
    }
    if (!Number.isInteger(r.cache_read_input_tokens) || r.cache_read_input_tokens < 0 ||
        !Number.isInteger(r.cache_write_input_tokens) || r.cache_write_input_tokens < 0 ||
        r.cache_read_input_tokens + r.cache_write_input_tokens > r.input_tokens) {
      throw new Error(`${f}: ${r.benchmark} has invalid cache token counts`);
    }
    if (!Number.isFinite(r.equivalent_cost_usd) || r.equivalent_cost_usd < 0) {
      throw new Error(`${f}: ${r.benchmark} has invalid equivalent_cost_usd ${r.equivalent_cost_usd}`);
    }

    activeTimeSecs += r.time_secs;
    inputTokens += r.input_tokens;
    outputTokens += r.output_tokens;
    cacheReadInputTokens += r.cache_read_input_tokens;
    cacheWriteInputTokens += r.cache_write_input_tokens;
    equivalentCostUsd += r.equivalent_cost_usd;

    if (r.check_verdict === "PASS") pass++;
    if (r.check_verdict === "CHEATING") cheating++;
    modeActive += r.time_secs;
    modeInput += r.input_tokens;
    modeOutput += r.output_tokens;
    modeCacheRead += r.cache_read_input_tokens;
    modeCacheWrite += r.cache_write_input_tokens;
    modeEquivalentCost += r.equivalent_cost_usd;

    const example = exampleDir(r.benchmark);
    if (!example || example === r.benchmark) {
      throw new Error(`${f}: benchmark "${r.benchmark}" does not identify an example directory`);
    }
    const scoringKey = expected.spec_id;
    bySource[r.source] = (bySource[r.source] ?? 0) + 1;
    const key = specKey(r.source, scoringKey);
    const spec = (bySpec[key] ??= {
      source: r.source,
      group: example,
      scoringKey,
      name: sourceSpecName(scoringKey),
      pass: 0,
      total: 0,
      activeTimeSecs: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheWriteInputTokens: 0,
      equivalentCostUsd: 0,
    });
    spec.total++;
    if (r.check_verdict === "PASS") spec.pass++;
    spec.activeTimeSecs += r.time_secs;
    spec.inputTokens += r.input_tokens;
    spec.outputTokens += r.output_tokens;
    spec.cacheReadInputTokens += r.cache_read_input_tokens;
    spec.cacheWriteInputTokens += r.cache_write_input_tokens;
    spec.equivalentCostUsd += r.equivalent_cost_usd;

    const steps = complexityByTask.get(r.benchmark);
    if (steps !== undefined) {
      const band = (byBand[bandFor(steps).id] ??= {
        pass: 0, total: 0, activeTimeSecs: 0, inputTokens: 0, outputTokens: 0,
        cacheReadInputTokens: 0, cacheWriteInputTokens: 0, equivalentCostUsd: 0,
      });
      band.total++;
      if (r.check_verdict === "PASS") band.pass++;
      band.activeTimeSecs += r.time_secs;
      band.inputTokens += r.input_tokens;
      band.outputTokens += r.output_tokens;
      band.cacheReadInputTokens += r.cache_read_input_tokens;
      band.cacheWriteInputTokens += r.cache_write_input_tokens;
      band.equivalentCostUsd += r.equivalent_cost_usd;
    }
  }

  if (serializeTaskManifest(results) !== canonicalTaskManifest) {
    throw new Error(`${f}: task set differs from results/core-manifest.json`);
  }
  for (const [source, expected] of Object.entries(CANONICAL)) {
    if ((bySource[source] ?? 0) !== expected) {
      throw new Error(`${f}: ${source} has ${bySource[source] ?? 0} tasks, Core expects ${expected}`);
    }
  }

  const auditedTotals = {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_read_input_tokens: cacheReadInputTokens,
    cache_write_input_tokens: cacheWriteInputTokens,
  };
  for (const [field, total] of Object.entries(auditedTotals)) {
    if (usageAudit[field] !== total) {
      throw new Error(`${f}: audited ${field} does not match result rows`);
    }
  }
  if (!sameNumber(usageAudit.equivalent_cost_usd, equivalentCostUsd)) {
    throw new Error(`${f}: audited equivalent_cost_usd does not match result rows`);
  }

  const rate = r1((pass / results.length) * 100);
  if (Math.abs(rate - meta.summary_by_mode[MODE].pass_rate) > 0.05) {
    throw new Error(`${f}: recomputed pass_rate ${rate} != meta ${meta.summary_by_mode[MODE].pass_rate}`);
  }
  if (meta.summary_by_mode?.["proof-from-scratch"]) {
    throw new Error(`${f}: meta claims proof-from-scratch but the site is Core completion only`);
  }

  const manifest = Object.values(bySpec)
    .map((spec) => ({
      source: spec.source,
      group: spec.group,
      scoringKey: spec.scoringKey,
      name: spec.name,
      completion: spec.total,
      scratch: 0,
    }))
    .sort((a, b) => a.source.localeCompare(b.source) || a.scoringKey.localeCompare(b.scoringKey));

  const representedSpecifications = manifest.length;
  const specBalancedPassRatePct = 100 * Object.values(bySpec)
    .reduce((sum, spec) => sum + spec.pass / spec.total, 0) / representedSpecifications;
  const completeSpecifications = Object.values(bySpec)
    .filter((spec) => spec.pass === spec.total).length;
  const allLeavesCompletePct = 100 * completeSpecifications / representedSpecifications;
  const taskMicroPct = 100 * pass / results.length;
  const scoring = meta.scoring;
  if (scoring?.primary !== "spec-balanced-pass-rate" ||
      !sameNumber(scoring.spec_balanced_pass_rate_pct, specBalancedPassRatePct) ||
      scoring.task_micro?.passed !== pass ||
      scoring.task_micro?.total !== results.length ||
      !sameNumber(scoring.task_micro?.pct, taskMicroPct) ||
      scoring.all_leaves_complete?.passed !== completeSpecifications ||
      scoring.all_leaves_complete?.total !== representedSpecifications ||
      !sameNumber(scoring.all_leaves_complete?.pct, allLeavesCompletePct)) {
    throw new Error(`${f}: meta.scoring does not match the current Core specification metrics`);
  }

  const rows = manifest.map(({ source, group, scoringKey, name, completion, scratch }) => {
    const sourceInfo = SOURCE_INFO[source];
    if (!sourceInfo) throw new Error(`${f}: missing display info for source "${source}"`);
    const url = specUrl(group);
    if (!url) throw new Error(`${f}: example "${group}" is missing an upstream URL`);
    return {
      id: specId(source, scoringKey),
      group,
      scoringKey,
      name,
      category: categoryFor(source),
      sourceKey: source,
      sourceName: sourceInfo.name,
      sourceUrl: sourceInfo.url,
      url,
      completion,
      scratch,
      total: completion + scratch,
    };
  });
  const ids = new Set(rows.map((row) => row.id));
  if (ids.size !== rows.length) throw new Error(`${f}: spec ids are not unique`);

  const perSpec = Object.fromEntries(manifest.map(({ source, scoringKey }) => {
    const spec = bySpec[specKey(source, scoringKey)];
    return [
      specId(source, scoringKey),
      {
        completion: modeStat({
          pass: spec.pass,
          total: spec.total,
          activeTimeSecs: spec.activeTimeSecs,
          inputTokens: spec.inputTokens,
          outputTokens: spec.outputTokens,
          cacheReadInputTokens: spec.cacheReadInputTokens,
          cacheWriteInputTokens: spec.cacheWriteInputTokens,
          equivalentCostUsd: spec.equivalentCostUsd,
        }),
        scratch: null,
      },
    ];
  }));

  const info = BACKEND_INFO[meta.backend];
  if (!info) throw new Error(`${f}: backend "${meta.backend}" missing from BACKEND_INFO`);
  const cohort = resolveCohort(meta, info);
  const completion = modeStat({
    pass,
    total: results.length,
    activeTimeSecs: modeActive,
    inputTokens: modeInput,
    outputTokens: modeOutput,
    cacheReadInputTokens: modeCacheRead,
    cacheWriteInputTokens: modeCacheWrite,
    equivalentCostUsd: modeEquivalentCost,
  });
  Object.assign(completion, {
    specBalancedPassRatePct: r1(specBalancedPassRatePct),
    completeSpecifications,
    representedSpecifications,
    allLeavesCompletePct: r1(allLeavesCompletePct),
  });
  return {
    id: meta.backend,
    ...info,
    kind: cohort === "agentic" ? "agent" : "base",
    cohort,
    cohortLabel: COHORT_LABEL[cohort],
    generated: meta.generated,
    resultsFile: `results/${f}`,
    resultsVersion,
    modes: [MODE_KEY],
    perMetric: {
      completion: completion.specBalancedPassRatePct,
      activeTimePerTask: activeTimeSecs / results.length,
      totalTokens: inputTokens + outputTokens,
      cacheRatePct: 100 * cacheReadInputTokens / inputTokens,
      equivalentCostUsd,
    },
    perMode: { completion, scratch: null },
    perComplexity: {
      completion: byBand
        ? COMPLEXITY_BANDS.map((band) => {
            const b = byBand[band.id];
            return b ? { id: band.id, ...modeStat({ ...b }) } : { id: band.id, ...EMPTY_BAND };
          })
        : null,
      scratch: null,
    },
    scope: null,
    usage: {
      taskCount: results.length,
      activeTimeSecs,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      cacheReadInputTokens,
      cacheWriteInputTokens,
      cacheRatePct: 100 * cacheReadInputTokens / inputTokens,
      equivalentCostUsd,
    },
    pricing: {
      asOf: usageAudit.date,
      source: priceSource,
    },
    perSpec,
    _specRows: rows,
    _cheating: cheating,
  };
});

// Spec catalog comes from the Core manifest via the first model (all identical).
const sortSpecs = (rows) => [...rows].sort((a, b) =>
  (a.category === b.category ? 0 : a.category === "libraries" ? -1 : 1) ||
  sourceSize(b.sourceKey) - sourceSize(a.sourceKey) ||
  a.sourceName.localeCompare(b.sourceName) || b.total - a.total || a.name.localeCompare(b.name));
const canonicalSpecs = sortSpecs(models[0]._specRows);
const catalogKey = (rows) => JSON.stringify(
  [...rows].map((row) => [row.id, row.completion, row.scratch]).sort((a, b) => a[0].localeCompare(b[0])),
);
const expectedCatalog = catalogKey(canonicalSpecs);
for (const model of models) {
  if (catalogKey(model._specRows) !== expectedCatalog) {
    throw new Error(`${model.id}: per-spec catalog differs from Core`);
  }
  delete model._specRows;
  delete model._cheating;
}

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
const categories = SITE.categories
  .map((category) => {
    const stats = categoryStats[category.id];
    if (category.id === "libraries") {
      return {
        ...category,
        ...stats,
        blurb: "Specs and proof properties from the TLA+ Examples repository, the TLAPS distribution, and the Apalache examples corpus (Konnov).",
      };
    }
    return { ...category, ...stats };
  })
  .filter((category) => category.specCount > 0);

const propertyCount = canonicalSpecs.reduce((n, spec) => n + spec.total, 0);
if (propertyCount !== CORE_COUNT) {
  throw new Error(`Core property count ${propertyCount} != ${CORE_COUNT}`);
}
if (canonicalSpecs.length !== CORE_SPEC_COUNT) {
  throw new Error(`Core spec count ${canonicalSpecs.length} != ${CORE_SPEC_COUNT} originating specifications`);
}

const suiteInfo = Object.fromEntries((SITE.suites ?? []).map((suite) => [suite.id, suite]));
if (!suiteInfo.core || !suiteInfo.full) {
  throw new Error("site-content.mjs: suites must declare core and full");
}
const fullCatalog = JSON.parse(readFileSync("results/full-suite-catalog.json", "utf8"));
if (!Array.isArray(fullCatalog.specs) || fullCatalog.specs.length === 0) {
  throw new Error("results/full-suite-catalog.json: missing specs");
}
if (fullCatalog.specCount !== fullCatalog.specs.length) {
  throw new Error(
    `results/full-suite-catalog.json: specCount ${fullCatalog.specCount} != ${fullCatalog.specs.length} specs`,
  );
}
const fullSpecKeys = new Set();
const fullCounts = { completion: 0, scratch: 0, total: 0 };
for (const spec of fullCatalog.specs) {
  if (typeof spec.scoringKey !== "string" || !spec.scoringKey.endsWith(".tla")) {
    throw new Error(`results/full-suite-catalog.json: spec ${spec.id} missing scoringKey`);
  }
  if (fullSpecKeys.has(spec.scoringKey)) {
    throw new Error(`results/full-suite-catalog.json: duplicate spec ${spec.scoringKey}`);
  }
  fullSpecKeys.add(spec.scoringKey);
  for (const field of ["completion", "scratch", "total"]) {
    if (!Number.isInteger(spec[field]) || spec[field] < 0) {
      throw new Error(`results/full-suite-catalog.json: spec ${spec.scoringKey} has invalid ${field}`);
    }
  }
  if (spec.total !== spec.completion + spec.scratch) {
    throw new Error(`results/full-suite-catalog.json: spec ${spec.scoringKey} total does not add up`);
  }
  fullCounts.completion += spec.completion;
  fullCounts.scratch += spec.scratch;
  fullCounts.total += spec.total;
}
if (fullCatalog.completion !== fullCounts.completion ||
    fullCatalog.scratch !== fullCounts.scratch ||
    fullCatalog.propertyCount !== fullCounts.total) {
  throw new Error("results/full-suite-catalog.json: declared task counts do not match its specs");
}
const suites = [
  {
    ...suiteInfo.core,
    blurb: suiteInfo.core.blurb.includes(String(CORE_COUNT))
      ? suiteInfo.core.blurb
      : suiteInfo.core.blurb.replace(/\d+/, String(CORE_COUNT)),
    specCount: canonicalSpecs.length,
    propertyCount: CORE_COUNT,
    completion: CORE_COUNT,
    scratch: 0,
    categories,
    specs: canonicalSpecs,
  },
  {
    ...suiteInfo.full,
    specCount: fullCatalog.specCount ?? fullCatalog.specs.length,
    propertyCount: fullCatalog.propertyCount,
    completion: fullCatalog.completion,
    scratch: fullCatalog.scratch,
    categories: fullCatalog.categories,
    specs: fullCatalog.specs,
  },
];

const data = {
  paper: SITE.paper,
  complexity: {
    label: "Reference proof steps",
    tip: "Steps in the benchmark's own reference proof for each theorem - a measure of the task's structural complexity, independent of any model. Bands are identical for every model, so the columns are directly comparable. Tasks with no recorded reference proof are left out.",
    bands: COMPLEXITY_BANDS.map(({ max, ...band }) => ({ ...band, max: Number.isFinite(max) ? max : null })),
  },
  metrics: [
    {
      id: "completion",
      name: "Spec-balanced pass rate",
      blurb: `Average of the task pass rates across the ${CORE_SPEC_COUNT} Core specifications.`,
      tip: `Average each Core specification's task pass rate, weighting all ${CORE_SPEC_COUNT} specifications equally.`,
    },
    {
      id: "activeTimePerTask",
      name: "Active time / task",
      invert: true,
      format: "duration",
      breakdown: false,
      groupStart: true,
      bar: false,
      tip: "Mean active agent time per task. The secondary value is the sum of task time; parallel tasks overlap, so it is not experiment wall-clock time. Lower is better.",
    },
  ],
  // Benchmark page switches between these Full-catalog defaults and suites[].
  categories: fullCatalog.categories,
  specs: fullCatalog.specs,
  suites,
  models: models.sort((a, b) => (b.perMetric.completion ?? -1) - (a.perMetric.completion ?? -1)),
  modes: SITE.modes,
  cohorts: SITE.cohorts,
  coverage: SITE.coverage,
  bibtex: SITE.bibtex,
  core: {
    suite: "proof-completion-core",
    taskCount: CORE_COUNT,
    manifest: "results/core-manifest.json",
  },
};

if (process.argv.includes("--check")) {
  console.log(`Validated: ${models.length} model(s), ${canonicalSpecs.length} Core specs, ${CORE_COUNT} properties.`);
} else {
  writeFileSync("data.js",
    "// GENERATED by scripts/build-data.mjs - do not edit by hand.\n" +
    "// Leaderboard data is recomputed from results/*.json against results/core-manifest.json;\n" +
    "// page content comes from scripts/site-content.mjs.\n" +
    "window.TLAPS_DATA = " + JSON.stringify(data, null, 2) + ";\n");
  console.log(`Wrote data.js: ${models.length} model(s), ${canonicalSpecs.length} Core specs (${CORE_SPEC_COUNT} originating specifications), ${CORE_COUNT} properties.`);
}
