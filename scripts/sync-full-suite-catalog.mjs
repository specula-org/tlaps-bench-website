import { readFileSync, writeFileSync } from "node:fs";

const CATALOG_PATH = "results/full-suite-catalog.json";
const [completionPath, scratchPath] = process.argv.slice(2);

if (!completionPath || !scratchPath) {
  throw new Error(
    "Usage: node scripts/sync-full-suite-catalog.mjs " +
    "<proof-completion-manifest.json> <proof-from-scratch-manifest.json>",
  );
}

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const catalog = readJson(CATALOG_PATH);
const manifests = {
  completion: readJson(completionPath),
  scratch: readJson(scratchPath),
};
const examples = catalog.examples ?? catalog.specs;

if (!Array.isArray(examples) || examples.length === 0) {
  throw new Error(`${CATALOG_PATH}: missing example metadata`);
}
if (!Array.isArray(catalog.categories) || catalog.categories.length === 0) {
  throw new Error(`${CATALOG_PATH}: missing categories`);
}

const manifestGroups = new Set();
for (const [mode, manifest] of Object.entries(manifests)) {
  if (!manifest || Array.isArray(manifest) || typeof manifest !== "object") {
    throw new Error(`${mode} manifest must be an object keyed by task path`);
  }
  for (const [task, metadata] of Object.entries(manifest)) {
    if (typeof metadata?.spec_id !== "string" || !metadata.spec_id.endsWith(".tla")) {
      throw new Error(`${mode} manifest task ${task}: missing spec_id`);
    }
    const group = task.split("/")[0];
    if (!group) throw new Error(`${mode} manifest task ${task}: missing example group`);
    manifestGroups.add(group);
  }
}

const normalizedExamples = examples.map((example) => {
  const group = manifestGroups.has(example.group)
    ? example.group
    : manifestGroups.has(example.name)
      ? example.name
      : null;
  if (!group) {
    throw new Error(`${CATALOG_PATH}: example ${example.name} has no manifest tasks`);
  }
  return { ...example, group };
});

const exampleByGroup = new Map();
for (const example of normalizedExamples) {
  if (exampleByGroup.has(example.group)) {
    throw new Error(`${CATALOG_PATH}: duplicate example group ${example.group}`);
  }
  exampleByGroup.set(example.group, example);
}
for (const group of manifestGroups) {
  if (!exampleByGroup.has(group)) {
    throw new Error(`${CATALOG_PATH}: no example metadata for manifest group ${group}`);
  }
}

const emptyCounts = () => ({ completion: 0, scratch: 0 });
const countsByExample = new Map(normalizedExamples.map((example) => [example.group, emptyCounts()]));
const specsById = new Map();

for (const [mode, manifest] of Object.entries(manifests)) {
  for (const [task, metadata] of Object.entries(manifest)) {
    const group = task.split("/")[0];
    const example = exampleByGroup.get(group);
    countsByExample.get(group)[mode]++;

    const existing = specsById.get(metadata.spec_id);
    if (existing && existing.group !== group) {
      throw new Error(`${metadata.spec_id}: tasks span example groups ${existing.group} and ${group}`);
    }
    const spec = existing ?? {
      specId: metadata.spec_id,
      group,
      completion: 0,
      scratch: 0,
    };
    spec[mode]++;
    specsById.set(metadata.spec_id, spec);
  }
}

const slug = (value) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
const exampleOrder = new Map(normalizedExamples.map((example, index) => [example.group, index]));
const specs = [...specsById.values()]
  .map((spec) => {
    const example = exampleByGroup.get(spec.group);
    return {
      id: `full--${slug(spec.specId)}`,
      group: spec.group,
      scoringKey: spec.specId,
      name: spec.specId.split("/").pop().replace(/\.tla$/i, ""),
      category: example.category,
      sourceKey: example.sourceKey,
      sourceName: example.sourceName,
      sourceUrl: example.sourceUrl,
      url: example.url,
      completion: spec.completion,
      scratch: spec.scratch,
      total: spec.completion + spec.scratch,
    };
  })
  .sort((a, b) =>
    exampleOrder.get(a.group) - exampleOrder.get(b.group) ||
    b.total - a.total ||
    a.name.localeCompare(b.name));

const ids = new Set(specs.map((spec) => spec.id));
if (ids.size !== specs.length) {
  throw new Error("generated Full catalog contains duplicate spec IDs");
}

const syncedExamples = normalizedExamples.map((example) => {
  const counts = countsByExample.get(example.group);
  return {
    ...example,
    completion: counts.completion,
    scratch: counts.scratch,
    total: counts.completion + counts.scratch,
  };
});

const categories = catalog.categories.map((category) => {
  const categoryExamples = syncedExamples.filter((example) => example.category === category.id);
  const categorySpecs = specs.filter((spec) => spec.category === category.id);
  return {
    ...category,
    exampleCount: categoryExamples.length,
    specCount: categorySpecs.length,
    completion: categorySpecs.reduce((total, spec) => total + spec.completion, 0),
    scratch: categorySpecs.reduce((total, spec) => total + spec.scratch, 0),
    total: categorySpecs.reduce((total, spec) => total + spec.total, 0),
  };
});

const completion = specs.reduce((total, spec) => total + spec.completion, 0);
const scratch = specs.reduce((total, spec) => total + spec.scratch, 0);
const output = {
  suite: "full",
  exampleCount: syncedExamples.length,
  specCount: specs.length,
  propertyCount: completion + scratch,
  completion,
  scratch,
  categories,
  examples: syncedExamples,
  specs,
};

writeFileSync(CATALOG_PATH, `${JSON.stringify(output, null, 2)}\n`);
console.log(
  `Wrote ${CATALOG_PATH}: ${output.propertyCount} tasks, ` +
  `${output.specCount} specs, ${output.exampleCount} examples.`,
);
