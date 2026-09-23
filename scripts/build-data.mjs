// Build the single-page leaderboard from the reported proof-from-scratch summary.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { SITE } from "./site-content.mjs";

const inputPath = "results/proof-from-scratch-summary.json";
const summary = JSON.parse(readFileSync(inputPath, "utf8"));
const documentMetrics = JSON.parse(readFileSync("results/document-metrics.json", "utf8"));
const { suite, cohort, source } = summary;
const fail = (message) => { throw new Error(`${inputPath}: ${message}`); };
const count = (value, label, min = 0) => {
  if (!Number.isInteger(value) || value < min) fail(`invalid ${label}`);
};
if (!source.url?.startsWith("https://docs.google.com/document/d/") ||
    !/^\d{4}-\d{2}-\d{2}$/.test(source.retrievedAt) ||
    !/^[a-f0-9]{64}$/.test(source.textSha256)) fail("missing source provenance");
if (!Array.isArray(suite.families) || !suite.families.length) fail("missing families");
const families = new Map();
for (const family of suite.families) {
  if (!family.id || !family.name || families.has(family.id)) fail("invalid or duplicate family");
  if (!["Protocol", "Code level"].includes(family.level)) fail(`invalid level: ${family.id}`);
  count(family.specCount, `${family.id} specs`, 1);
  count(family.taskCount, `${family.id} tasks`, 1);
  families.set(family.id, family);
}
const sum = (rows, field) => rows.reduce((total, row) => total + row[field], 0);
if (sum(suite.families, "taskCount") !== suite.taskCount ||
    sum(suite.families, "specCount") !== suite.specCount) fail("suite totals do not match families");
if (!Array.isArray(cohort.familyIds) || !cohort.familyIds.length ||
    new Set(cohort.familyIds).size !== cohort.familyIds.length) fail("invalid cohort family list");
const testedFamilies = cohort.familyIds.map((id) => {
  if (!families.has(id)) fail(`unknown cohort family: ${id}`);
  return families.get(id);
});
if (!Array.isArray(SITE.taskFamilyOrder) || SITE.taskFamilyOrder.length !== cohort.familyIds.length ||
    new Set(SITE.taskFamilyOrder).size !== cohort.familyIds.length ||
    SITE.taskFamilyOrder.some((id) => !families.has(id))) fail("invalid README task-family order");
if (sum(testedFamilies, "taskCount") !== cohort.taskCount ||
    sum(testedFamilies, "specCount") !== cohort.specCount) fail("cohort totals do not match families");
if (!Array.isArray(cohort.models) || !cohort.models.length) fail("missing models");
const modelIds = new Set();
let canonicalTaskIds;
const usageFields = ["timeSecs", "inputTokens", "outputTokens", "turns", "costUsd"];
const close = (a, b) => Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(a), Math.abs(b));
for (const model of cohort.models) {
  if (!model.id || !model.name || modelIds.has(model.id)) fail("invalid or duplicate model");
  modelIds.add(model.id);
  if (!model.harness || !model.effort || !existsSync(model.logo)) fail(`missing model metadata: ${model.id}`);
  if (!Array.isArray(model.results) || model.results.length !== cohort.familyIds.length) {
    fail(`incomplete family coverage: ${model.id}`);
  }
  const seen = new Set();
  for (const result of model.results) {
    if (!cohort.familyIds.includes(result.family) || seen.has(result.family)) {
      fail(`invalid or duplicate result: ${model.id}/${result.family}`);
    }
    seen.add(result.family);
    count(result.passed, `${model.id}/${result.family} passes`);
    if (result.total !== families.get(result.family).taskCount || result.passed > result.total) {
      fail(`invalid denominator: ${model.id}/${result.family}`);
    }
  }
  if (sum(model.results, "passed") !== model.passed || sum(model.results, "total") !== model.total ||
      model.total !== cohort.taskCount) fail(`model total does not match results: ${model.id}`);
  for (const field of ["totalHours", "minutesPerTask", "turnsPerTask", "inputTokensPerTaskM", "outputTokensPerTaskM"]) {
    if (!Number.isFinite(model[field]) || model[field] < 0) fail(`invalid ${field}: ${model.id}`);
  }
  if (!model.costLabel || !Array.isArray(model.specs) || model.specs.length !== cohort.specCount) {
    fail(`missing specification details: ${model.id}`);
  }
  const specIds = new Set();
  const taskIds = new Set();
  for (const spec of model.specs) {
    if (!spec.id || !spec.name || specIds.has(spec.id) || !cohort.familyIds.includes(spec.family)) {
      fail(`invalid specification: ${model.id}/${spec.id}`);
    }
    specIds.add(spec.id);
    if (!/^[a-f0-9]{64}$/.test(spec.resultSha256)) fail(`missing result hash: ${spec.id}`);
    if (!Array.isArray(spec.tasks) || spec.tasks.length !== spec.total) fail(`invalid task coverage: ${spec.id}`);
    for (const task of spec.tasks) {
      if (!task.id || !task.name || taskIds.has(task.id)) fail(`invalid task: ${model.id}/${task.id}`);
      taskIds.add(task.id);
      if (!["PASS", "FAIL", "UNRESOLVED", "TIMEOUT", "CHEATING", "ERROR"].includes(task.verdict)) {
        fail(`unknown task verdict: ${task.id}/${task.verdict}`);
      }
      for (const field of ["obligations", "helperCount"]) {
        if (task[field] != null) count(task[field], `${task.id}/${field}`);
      }
    }
    if (spec.tasks.filter((task) => task.verdict === "PASS").length !== spec.passed) {
      fail(`task verdicts disagree with specification score: ${spec.id}`);
    }
    for (const field of usageFields) {
      if (!Number.isFinite(spec[field]) || spec[field] < 0) fail(`invalid ${field}: ${spec.id}`);
    }
    if (spec.cacheReadInputTokens != null && (!Number.isFinite(spec.cacheReadInputTokens) ||
        spec.cacheReadInputTokens < 0 || spec.cacheReadInputTokens > spec.inputTokens)) {
      fail(`invalid cache usage: ${spec.id}`);
    }
  }
  const identity = [...taskIds].sort().join("\n");
  if (canonicalTaskIds != null && canonicalTaskIds !== identity) fail("model task sets differ");
  canonicalTaskIds = identity;
  if (taskIds.size !== cohort.taskCount) fail(`wrong task count: ${model.id}`);
  for (const result of model.results) {
    const specs = model.specs.filter((spec) => spec.family === result.family);
    if (specs.length !== families.get(result.family).specCount || sum(specs, "passed") !== result.passed ||
        sum(specs, "total") !== result.total) fail(`family details disagree with summary: ${model.id}/${result.family}`);
  }
  for (const field of usageFields) {
    if (!Number.isFinite(model.usage?.[field]) || !close(sum(model.specs, field), model.usage[field])) {
      fail(`usage details disagree with summary: ${model.id}/${field}`);
    }
  }
  if (!close(Number((model.usage.timeSecs / 3600).toFixed(1)), model.totalHours) ||
      Math.ceil(model.usage.timeSecs / 60 / model.total) !== model.minutesPerTask ||
      Math.ceil(model.usage.turns / model.total) !== model.turnsPerTask ||
      !close(Number((model.usage.inputTokens / model.total / 1e6).toFixed(1)), model.inputTokensPerTaskM) ||
      !close(Number((model.usage.outputTokens / model.total / 1e6).toFixed(3)), model.outputTokensPerTaskM)) {
    fail(`usage details disagree with the reported rounded metrics: ${model.id}`);
  }
}
const metricColumns = ["Total hours", "Minutes / inv", "Turns / inv", "Tokens in / out per inv (M)", "Cost / inv (USD)", "Cost (USD)"];
const metricKeys = ["totalHours", "minutesPerInv", "turnsPerInv", "tokensInOutPerInvM", "costPerInvUsd", "costUsd"];
if (documentMetrics.sourceUrl !== source.url + "?tab=t.0" ||
    documentMetrics.retrievedAt !== source.retrievedAt ||
    !/^[a-f0-9]{64}$/.test(documentMetrics.textSha256) ||
    documentMetrics.tables?.length !== cohort.models.length) fail("invalid document metric snapshot");
const modelDocuments = new Map();
for (const table of documentMetrics.tables) {
  const model = cohort.models.find((item) => item.id === table.modelId);
  if (!model || modelDocuments.has(model.id)) fail("unknown or duplicate document table");
  const columns = ["Task family", "Level", "Specs / inv", model.name, ...metricColumns];
  if (JSON.stringify(table.columns) !== JSON.stringify(columns) || table.rows?.length !== cohort.familyIds.length + 1) {
    fail(`document column/row mismatch: ${model.id}`);
  }
  const money = (value) => model.id === "opus-5"
    ? "$" + Math.round(value).toLocaleString("en-US")
    : value < 0.01 ? "<$0.01" : "$" + value.toFixed(2);
  const metrics = {};
  table.rows.forEach((row, index) => {
    const result = model.results[index];
    const family = result && families.get(result.family);
    const specs = result ? model.specs.filter((spec) => spec.family === result.family) : model.specs;
    const usage = Object.fromEntries(usageFields.map((field) => [field, sum(specs, field)]));
    const passed = result ? result.passed : model.passed;
    const total = result ? result.total : model.total;
    const rate = 100 * passed / total;
    const score = `${passed}/${total} (${Number.isInteger(rate) ? rate : rate.toFixed(1)}%)`;
    const expected = [
      family?.name ?? "Total / average", family?.level ?? "", `${specs.length} / ${total}`, score,
      (usage.timeSecs / 3600).toFixed(1), String(Math.ceil(usage.timeSecs / 60 / total)),
      Math.ceil(usage.turns / total).toLocaleString("en-US"),
      `${(usage.inputTokens / total / 1e6).toFixed(1)} / ${(usage.outputTokens / total / 1e6).toFixed(3)}`,
      money(usage.costUsd / total), money(usage.costUsd),
    ];
    if (JSON.stringify(row) !== JSON.stringify(expected)) {
      fail(`document metrics disagree with recorded results: ${model.id}/${family?.id ?? "total"}\nDocument: ${JSON.stringify(row)}\nComputed: ${JSON.stringify(expected)}`);
    }
    metrics[family?.id ?? "total"] = {
      specsInv: row[2],
      ...Object.fromEntries(metricKeys.map((key, i) => [key, row[i + 4]])),
    };
  });
  modelDocuments.set(model.id, metrics);
}
const data = {
  ...SITE,
  ...summary,
  cohort: {
    ...cohort,
    models: cohort.models.map((model) => ({
      ...model, passRate: model.passed / model.total * 100,
      documentMetrics: modelDocuments.get(model.id),
    }))
      .sort((a, b) => b.passRate - a.passRate || a.name.localeCompare(b.name)),
  },
};
const outputPath = "data.js";
const generated = "// Generated by scripts/build-data.mjs. Do not edit directly.\n" +
  "window.TLAPS_DATA = " + JSON.stringify(data, null, 2) + ";\n";
if (process.argv.includes("--check")) {
  if (!existsSync(outputPath) || readFileSync(outputPath, "utf8") !== generated) {
    throw new Error(`${outputPath} is stale; run npm run build:data`);
  }
  console.log(`Validated ${data.cohort.models.length} models on ${cohort.taskCount} tasks across ${cohort.specCount} specs.`);
} else {
  writeFileSync(outputPath, generated);
  console.log(`Wrote ${outputPath}: ${data.cohort.models.length} models, ${cohort.taskCount} reported tasks; ${suite.taskCount} tasks in the collection.`);
}
