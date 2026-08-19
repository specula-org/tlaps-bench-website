const githubFile = (repo, revision, path) =>
  `https://github.com/${repo}/blob/${revision}/${path}`;

const TLAPLUS_EXAMPLES_REVISION = "master";
const TLAPLUS_EXAMPLES_HISTORICAL_REVISION =
  "91c22ea537853196ed1e03e9ad91693ec37642de";
const FLASH_PROTOCOL_REVISION = "352084b3e3b57b37b47973afdee224b5979f574d";
const APALACHE_EXAMPLES_REVISION =
  "af360379b7cbcd1e16c1a801ff8ac64eb9aca038";

const TLAPM_SINGLE_FILE_GROUPS = new Set([
  "Allocator",
  "Bakery",
  "BubbleSort",
  "EWD840",
  "Peterson",
  "SimpleMutex",
  "SumAndMax",
]);

const HENGXIN_GROUPS = new Set([
  "AtomicBakery",
  "Euclid",
  "Paxos",
  "Record",
]);

const fileName = (scoringKey) => scoringKey.split("/").pop();

// Resolve the exact upstream artifact represented by a benchmark specification.
// Most rows map to a .tla file. Translated rows map to their original Ivy or
// Rust source, and historical imports stay pinned to the recorded revision.
export const specSourceUrl = ({ group, scoringKey }) => {
  if (typeof group !== "string" || !group ||
      typeof scoringKey !== "string" || !scoringKey.endsWith(".tla")) {
    return null;
  }

  const file = fileName(scoringKey);

  if (group.startsWith("ivy_examples_")) {
    const example = group.slice("ivy_examples_".length);
    return githubFile("kenmcmil/ivy", "master", `examples/liveness/${example}.ivy`);
  }

  if (group === "etcd_raft") {
    return githubFile(
      "specula-org/Specula",
      "main",
      "skills/spec_generation/examples/etcdraft.tla",
    );
  }
  if (group === "two_thread_mutex") {
    return githubFile("anvil-verifier/anvil", "main", "src/tla_demo.rs");
  }
  if (group === "ZooKeeper") {
    return githubFile("Disalg-ICS-NJU/zookeeper-tla-spec", "main", "high-level-spec/Zab.tla");
  }
  if (group === "ZooKeeper_LowLevel") {
    return githubFile(
      "Disalg-ICS-NJU/zookeeper-tla-spec",
      "main",
      `low-level-spec/zk-3.7/${file}`,
    );
  }
  if (group === "OpenAddressing") {
    return githubFile("lemmy/Examples", "mku-OA", `specifications/TLC/${file}`);
  }

  if (group === "Data") {
    return githubFile("tlaplus/tlapm", "main", `zenon/regression/examples/data/${file}`);
  }
  if (group === "Consensus") {
    return githubFile("tlaplus/tlapm", "main", `examples_draft/consensus/${file}`);
  }
  if (group === "Cantor") {
    return githubFile("tlaplus/tlapm", "main", `examples/cantor/${file}`);
  }
  if (TLAPM_SINGLE_FILE_GROUPS.has(group)) {
    return githubFile("tlaplus/tlapm", "main", `examples/${file}`);
  }
  if (HENGXIN_GROUPS.has(group)) {
    return githubFile("hengxin/tlaps-examples", "master", scoringKey);
  }

  if (group === "apalache_examples_ben-or83") {
    return githubFile(
      "konnov/apalache-examples",
      APALACHE_EXAMPLES_REVISION,
      `ben-or83/${file}`,
    );
  }
  if (group === "apalache_examples_tendermint") {
    return githubFile(
      "konnov/apalache-examples",
      APALACHE_EXAMPLES_REVISION,
      `tendermint/${file}`,
    );
  }

  if (group === "tlaplus_examples_BlockingQueue") {
    return githubFile("lemmy/BlockingQueue", "main", file);
  }
  if (group === "tlaplus_examples_TencentPaxos") {
    return githubFile("Starydark/Tencent-Paxos-TLA", "master", file);
  }
  if (group === "tlaplus_examples_Termination") {
    return githubFile("nano-o/Distributed-termination-detection", "main", file);
  }
  if (group === "tlaplus_examples_GermanProtocol") {
    const upstreamFile = file === "GermanControlBenchmarks.tla"
      ? "GermanControl.tla"
      : file;
    return githubFile(
      "tlaplus/Examples",
      TLAPLUS_EXAMPLES_HISTORICAL_REVISION,
      `specifications/GermanProtocol/${upstreamFile}`,
    );
  }
  if (group === "tlaplus_examples_FlashProtocol") {
    return githubFile(
      "tlaplus/Examples",
      FLASH_PROTOCOL_REVISION,
      `specifications/FlashProtocol/${file}`,
    );
  }

  if (group.startsWith("tlaplus_examples_")) {
    const example = group.slice("tlaplus_examples_".length);
    const revision = group === "tlaplus_examples_ewd687a"
      ? TLAPLUS_EXAMPLES_HISTORICAL_REVISION
      : TLAPLUS_EXAMPLES_REVISION;
    const directory = example.startsWith("SpecifyingSystems_")
      ? `specifications/SpecifyingSystems/${example.slice("SpecifyingSystems_".length)}`
      : `specifications/${example}`;
    return githubFile("tlaplus/Examples", revision, `${directory}/${file}`);
  }

  return null;
};
