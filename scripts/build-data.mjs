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

// Per-mode task totals implied by the manifest above. A result bundle may cover
// both modes or just one; each mode it covers must be complete.
const MODE_RECORDS = {
  "proof-completion": Object.values(CANONICAL).reduce((n, [completion]) => n + completion, 0),
  "proof-from-scratch": Object.values(CANONICAL).reduce((n, [, scratch]) => n + scratch, 0),
};
if (MODES.reduce((n, mode) => n + MODE_RECORDS[mode], 0) !== RECORDS) {
  throw new Error("canonical manifest does not sum to the expected record total");
}
const MODE_KEY = { "proof-completion": "completion", "proof-from-scratch": "scratch" };

// The one hand-maintained table: display info per backend id.
// name = the underlying model (primary label); subname = the agent/endpoint, shown below it.
const BACKEND_INFO = {
  copilot: { name: "Opus-4.8", subname: "GitHub Copilot", org: "GitHub", logo: null, kind: "agent" },
  "copilot-gemini-3.1-pro-preview": { name: "Gemini 3.1 Pro Preview", subname: "GitHub Copilot", org: "GitHub", logo: null, kind: "agent" },
  "copilot-gpt-5.6-sol": { name: "GPT-5.6-Sol", subname: "GitHub Copilot · Agentic", org: "GitHub", logo: null, kind: "agent" },
  codex: { name: "GPT-5.5", subname: "OpenAI Codex", org: "OpenAI", logo: null, kind: "agent" },
};

// A reproducible output-only estimate, not the experiments' actual bill. Every
// backend uses public standard-tier output rates from its own audit date, with
// model-specific rates when a run records secondary-model output. Long-context
// tiers cannot be inferred without complete per-request input.
// A backend with no entry here publishes no cost at all: its cost cells render as
// a dash rather than an invented rate. Add the entry to turn the numbers on.
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
  "copilot-gpt-5.6-sol": {
    usdPerMillionTokens: 30,
    tier: "standard (up to 272K input tokens)",
    asOf: "2026-07-26",
    source: "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
    additionalModels: {
      "claude-opus-4.8": {
        name: "Claude Opus 4.8",
        usdPerMillionTokens: 25,
        tier: "standard",
      },
      "gpt-5.6-terra": {
        name: "GPT-5.6-Terra",
        usdPerMillionTokens: 15,
        tier: "standard (up to 272K input tokens)",
      },
    },
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
// pricing may be null for a backend with no published output rate; the cost
// fields then stay null so the UI shows a dash instead of a fabricated number.
const modeStat = (pm, pricing) => {
  if (!pm || pm.total <= 0) return null;
  const outputCostUsd = pricing ? pm.outputCostUnits / 1_000_000 : null;
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
    outputCostPerTask: outputCostUsd === null ? null : outputCostUsd / pm.total,
  };
};

let canonicalSpecs = null;
let canonicalSpecManifest = null;
let canonicalTaskManifest = null;

const resultFiles = readdirSync("results").filter((f) => f.endsWith(".json")).sort();
if (resultFiles.length === 0) throw new Error("results/: no backend JSON files found");

// A bundle covers the modes it has records for. Full-scope bundles (both modes)
// define the canonical spec and task manifests; mode-partial bundles are then
// checked against those manifests restricted to the modes they claim.
const bundles = resultFiles.map((f) => {
  const resultText = readFileSync(`results/${f}`, "utf8");
  const { meta, results } = JSON.parse(resultText);
  if (!Array.isArray(results) || results.length === 0) throw new Error(`${f}: no results[]`);
  const covered = MODES.filter((mode) => results.some((r) => r.mode === mode));
  if (covered.length === 0) throw new Error(`${f}: no records in any known mode`);
  return {
    f, meta, results, covered,
    resultsVersion: createHash("sha256").update(resultText).digest("hex").slice(0, 12),
  };
});
if (!bundles.some((b) => b.covered.length === MODES.length)) {
  throw new Error("results/: no full-scope bundle to anchor the canonical manifests");
}
// Deterministic anchor: the alphabetically first bundle that covers both modes.
// It is validated first so the canonical manifests exist before any partial
// bundle is compared against them.
const anchorBundle = bundles.find((b) => b.covered.length === MODES.length);
const anchor = anchorBundle.f;
const ordered = [anchorBundle, ...bundles.filter((b) => b !== anchorBundle)];

const models = ordered.map(({ f, meta, results, covered, resultsVersion }) => {
  const isFullScope = covered.length === MODES.length;
  const expectedRecords = covered.reduce((n, mode) => n + MODE_RECORDS[mode], 0);
  const usageAudit = meta.usage_audit;
  const outputTokensVouched = usageAudit?.output_tokens_audited === true ||
    usageAudit?.output_tokens_positive_for_all_tasks === true;
  if (!usageAudit || usageAudit.task_count !== results.length ||
      usageAudit.active_time_complete !== true || !outputTokensVouched) {
    throw new Error(`${f}: missing audited ${results.length}-task usage data`);
  }

  // No entry means this backend has no published rate on file: cost is withheld
  // rather than guessed. An entry that is present must still be well formed.
  const pricing = OUTPUT_PRICING[meta.backend] ?? null;
  if (pricing) {
    if (!Number.isFinite(pricing.usdPerMillionTokens) || pricing.usdPerMillionTokens <= 0) {
      throw new Error(`${f}: invalid output pricing for ${meta.backend}`);
    }
    if (pricing.asOf !== usageAudit.date) {
      throw new Error(`${f}: pricing date ${pricing.asOf} does not match usage audit ${usageAudit.date}`);
    }
    for (const [model, modelPricing] of Object.entries(pricing.additionalModels ?? {})) {
      if (!Number.isFinite(modelPricing.usdPerMillionTokens) ||
          modelPricing.usdPerMillionTokens <= 0) {
        throw new Error(`${f}: invalid output pricing for secondary model ${model}`);
      }
    }
  }

  // ---- validate: recompute from results[], check against canon and meta ----
  if (results.length !== expectedRecords) {
    throw new Error(`${f}: ${results.length} records != ${expectedRecords} for modes [${covered.join(", ")}]`);
  }
  const byMode = {};
  const bySource = {};
  const bySpec = {};
  let activeTimeSecs = 0;
  let outputTokens = 0;
  let outputCostUnits = pricing ? 0 : null;
  const secondaryUsageTotals = {};
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
    let rowOutputCostUnits = pricing
      ? r.output_tokens * pricing.usdPerMillionTokens
      : null;
    let secondaryOutputTokens = 0;
    for (const [model, usage] of Object.entries(r.secondary_model_usage ?? {})) {
      if (!Number.isInteger(usage.observed_requests) || usage.observed_requests <= 0 ||
          !Number.isInteger(usage.requests_with_output_tokens) ||
          usage.requests_with_output_tokens < 0 ||
          usage.requests_with_output_tokens > usage.observed_requests ||
          !Number.isInteger(usage.output_tokens_lower_bound) ||
          usage.output_tokens_lower_bound < 0) {
        throw new Error(`${f}: ${r.benchmark} has invalid secondary usage for ${model}`);
      }
      if (model === meta.model) {
        throw new Error(`${f}: ${r.benchmark} lists primary model ${model} as secondary`);
      }
      secondaryOutputTokens += usage.output_tokens_lower_bound;
      const total = (secondaryUsageTotals[model] ??= {
        observed_requests: 0,
        requests_with_output_tokens: 0,
        output_tokens_lower_bound: 0,
      });
      total.observed_requests += usage.observed_requests;
      total.requests_with_output_tokens += usage.requests_with_output_tokens;
      total.output_tokens_lower_bound += usage.output_tokens_lower_bound;

      if (rowOutputCostUnits !== null && usage.output_tokens_lower_bound > 0) {
        const modelPricing = pricing.additionalModels?.[model];
        if (!modelPricing) {
          throw new Error(`${f}: missing output pricing for secondary model ${model}`);
        }
        rowOutputCostUnits += usage.output_tokens_lower_bound *
          (modelPricing.usdPerMillionTokens - pricing.usdPerMillionTokens);
      }
    }
    if (secondaryOutputTokens > r.output_tokens) {
      throw new Error(`${f}: ${r.benchmark} secondary output exceeds task output`);
    }
    if (outputCostUnits !== null) outputCostUnits += rowOutputCostUnits;

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
      outputCostUnits: 0,
    });
    m.total++;
    m[r.check_verdict] = (m[r.check_verdict] ?? 0) + 1;
    m.activeTimeSecs += r.time_secs;
    m.outputTokens += r.output_tokens;
    m.outputCostUnits += rowOutputCostUnits ?? 0;

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
      outputCostUnits: 0,
    });
    specMode.total++;
    if (r.check_verdict === "PASS") specMode.pass++;
    specMode.activeTimeSecs += r.time_secs;
    specMode.outputTokens += r.output_tokens;
    specMode.outputCostUnits += rowOutputCostUnits ?? 0;
  }

  const outputCostLowerBound = Number.isInteger(usageAudit.output_tokens_lower_bound);
  if (outputCostLowerBound && usageAudit.output_tokens_lower_bound !== outputTokens) {
    throw new Error(`${f}: output token lower bound does not match result rows`);
  }
  const outputUsageByModel = usageAudit.output_usage_by_model;
  if (outputUsageByModel) {
    if (outputUsageByModel.status !== "lower_bound" ||
        outputUsageByModel.attribution !== "resolved_model_else_requested_model" ||
        !outputUsageByModel.models || typeof outputUsageByModel.models !== "object") {
      throw new Error(`${f}: invalid output_usage_by_model audit`);
    }
    let auditedOutputTokens = 0;
    for (const [model, usage] of Object.entries(outputUsageByModel.models)) {
      if (!Number.isInteger(usage.observed_requests) || usage.observed_requests <= 0 ||
          !Number.isInteger(usage.requests_with_output_tokens) ||
          usage.requests_with_output_tokens < 0 ||
          usage.requests_with_output_tokens > usage.observed_requests ||
          !Number.isInteger(usage.output_tokens_lower_bound) ||
          usage.output_tokens_lower_bound < 0) {
        throw new Error(`${f}: invalid audited output usage for ${model}`);
      }
      auditedOutputTokens += usage.output_tokens_lower_bound;
    }
    if (auditedOutputTokens !== outputTokens) {
      throw new Error(`${f}: model-attributed output does not match result rows`);
    }
    if (!meta.model || !outputUsageByModel.models[meta.model]) {
      throw new Error(`${f}: model-attributed output omits primary model`);
    }
    const auditedSecondaryModels = Object.keys(outputUsageByModel.models)
      .filter((model) => model !== meta.model).sort();
    const taskSecondaryModels = Object.keys(secondaryUsageTotals).sort();
    if (JSON.stringify(auditedSecondaryModels) !== JSON.stringify(taskSecondaryModels)) {
      throw new Error(`${f}: task and model audits disagree on secondary models`);
    }
    const secondaryOutputTokens = Object.values(secondaryUsageTotals)
      .reduce((sum, usage) => sum + usage.output_tokens_lower_bound, 0);
    if (outputUsageByModel.models[meta.model].output_tokens_lower_bound !==
        outputTokens - secondaryOutputTokens) {
      throw new Error(`${f}: primary-model output does not match task attribution`);
    }
    for (const [model, usage] of Object.entries(secondaryUsageTotals)) {
      if (JSON.stringify(outputUsageByModel.models[model]) !== JSON.stringify(usage)) {
        throw new Error(`${f}: task attribution does not match ${model} usage audit`);
      }
    }
  } else if (Object.keys(secondaryUsageTotals).length > 0) {
    throw new Error(`${f}: secondary model usage lacks a model-level audit`);
  }

  for (const [source, counts] of Object.entries(CANONICAL)) {
    const got = bySource[source]?.perMode ?? {};
    for (const mode of MODES) {
      // Modes this bundle does not cover must contribute nothing at all.
      const expected = covered.includes(mode) ? counts[MODES.indexOf(mode)] : 0;
      if ((got[mode]?.total ?? 0) !== expected) {
        throw new Error(`${f}: ${source} [${mode}] counts don't match the canonical manifest`);
      }
    }
  }
  for (const mode of covered) {
    const rate = r1((byMode[mode].PASS / byMode[mode].total) * 100);
    if (Math.abs(rate - meta.summary_by_mode[mode].pass_rate) > 0.05) {
      throw new Error(`${f}: recomputed ${mode} pass_rate ${rate} != meta ${meta.summary_by_mode[mode].pass_rate}`);
    }
  }
  for (const mode of MODES.filter((m) => !covered.includes(m))) {
    if (meta.summary_by_mode?.[mode]) {
      throw new Error(`${f}: meta claims ${mode} results but no records are present`);
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
  const serializedManifest = JSON.stringify(manifest);
  if (isFullScope && canonicalSpecManifest === null) {
    if (manifest.length !== SPECS) throw new Error(`${f}: ${manifest.length} specs != ${SPECS}`);
    canonicalSpecManifest = serializedManifest;
  } else {
    // Restrict the canon to this bundle's modes: zero out the modes it does not
    // cover, then drop specs left with no tasks at all.
    const expected = JSON.parse(canonicalSpecManifest)
      .map((row) => ({
        ...row,
        completion: covered.includes("proof-completion") ? row.completion : 0,
        scratch: covered.includes("proof-from-scratch") ? row.scratch : 0,
      }))
      .filter((row) => row.completion + row.scratch > 0);
    if (manifest.length !== expected.length) {
      throw new Error(`${f}: ${manifest.length} specs != ${expected.length} for modes [${covered.join(", ")}]`);
    }
    if (serializedManifest !== JSON.stringify(expected)) {
      throw new Error(`${f}: per-spec manifest differs from ${anchor}`);
    }
  }

  const taskManifest = results
    .map((r) => ({ mode: r.mode, benchmark: r.benchmark, theorem: r.theorem, source: r.source }))
    .sort((a, b) => a.mode.localeCompare(b.mode) || a.benchmark.localeCompare(b.benchmark));
  const taskIds = new Set(taskManifest.map((r) => `${r.mode}\n${r.benchmark}`));
  if (taskIds.size !== results.length) throw new Error(`${f}: task identities are not unique`);
  const serializedTaskManifest = JSON.stringify(taskManifest);
  if (isFullScope && canonicalTaskManifest === null) {
    canonicalTaskManifest = serializedTaskManifest;
  } else {
    const expected = JSON.parse(canonicalTaskManifest).filter((row) => covered.includes(row.mode));
    if (serializedTaskManifest !== JSON.stringify(expected)) {
      throw new Error(`${f}: task manifest differs from ${anchor}`);
    }
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
        completion: modeStat(spec.perMode["proof-completion"], pricing),
        scratch: modeStat(spec.perMode["proof-from-scratch"], pricing),
      },
    ];
  }));

  const info = BACKEND_INFO[meta.backend] ?? { name: meta.backend, org: "?", logo: null, kind: "base" };
  // A mode this bundle does not cover stays null all the way through, so the
  // leaderboard shows a dash and ranks the model last in that mode.
  const perMode = Object.fromEntries(MODES.map((mode) => [
    MODE_KEY[mode],
    covered.includes(mode)
      ? modeStat({ ...byMode[mode], pass: byMode[mode].PASS }, pricing)
      : null,
  ]));
  const outputCostUsd = outputCostUnits === null ? null : outputCostUnits / 1_000_000;
  return {
    id: meta.backend,
    ...info,
    generated: meta.generated,
    resultsFile: `results/${f}`,
    resultsVersion,
    modes: covered.map((mode) => MODE_KEY[mode]),
    perMetric: {
      completion: perMode.completion?.rate ?? null,
      scratch: perMode.scratch?.rate ?? null,
      activeTimePerTask: activeTimeSecs / results.length,
      outputCostPerTask: outputCostUsd === null ? null : outputCostUsd / results.length,
    },
    perMode,
    usage: {
      taskCount: results.length,
      activeTimeSecs,
      outputTokens,
      outputCostUsd,
      ...(outputCostUsd !== null && outputCostLowerBound ? { outputCostLowerBound: true } : {}),
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
      tip: "Mean estimated output-only cost per task in the selected mode, using recorded output tokens and public standard-tier rates from each model's audit date. Model-specific rates are applied when a run invokes more than one model. A ≥ prefix marks incomplete telemetry, so the amount is a lower bound. Long-context tiers are not inferred. The secondary value is that mode's total. Lower is better." },
  ],
  categories,
  specs: canonicalSpecs,
  // Initial order matches the leaderboard's default sort. The two modes remain
  // separate; there is deliberately no hidden blended headline score. A model
  // that did not run a mode has no rate there and sorts last.
  models: models.sort((a, b) => (b.perMetric.completion ?? -1) - (a.perMetric.completion ?? -1)),
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
