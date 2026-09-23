export const SITE = {
  title: "TLAPS-Bench",
  repo: "https://github.com/specula-org/tlaps-bench",
  introduction:
    "A benchmark for writing machine-checked TLA+ proofs of complex protocols and system implementations.",
  taskFamilyOrder: [
    "ivy-liveness", "cache-coherence", "zookeeper-protocol", "cahill-ssi",
    "ivy-tlb", "open-addressing", "btree", "etcd-raft", "zookeeper-implementation", "mongodb-transactions",
  ],
  taskFamilyOrderSource: "https://github.com/specula-org/tlaps-bench/blob/d9b4722dca22fb5b71c3680e77911b61ae805784/README.md#benchmark-problems",
};
