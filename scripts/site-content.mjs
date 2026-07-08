// Hand-maintained page content that the leaderboard pipeline preserves verbatim.
// build-data.mjs spreads this into data.js alongside the generated leaderboard
// (metrics/tasks/models). Home, Benchmark, and Cite render from these fields.

export const SITE = {
  paper: {
    title: "TLAPS-Bench: Evaluating AI on Writing TLAPS Proofs",
    repo: "https://github.com/specula-org/tlaps-bench",
    overview:
      "TLAPS proofs are checked mechanically by tlapm: a proof is either accepted or " +
      "rejected, with no partial credit and no room for a plausible-but-wrong argument. " +
      "Each task presents a TLA+ theorem whose proof body is replaced by PROOF OBVIOUS; " +
      "the AI must replace it with a real proof that tlapm accepts. That makes proof " +
      "construction a sharp test of an AI's formal reasoning.",
  },

  // Benchmark page: the two task-type cards.
  modes: [
    { id: "completion", name: "--mode proof-completion", full: "--mode proof-completion",
      cli: "--mode proof-completion",
      blurb: "The full scaffolding is given, including inductive invariants, lemma " +
             "decomposition, and preceding lemmas marked PROOF OMITTED, and the AI fills " +
             "in one target proof." },
    { id: "scratch", name: "--mode proof-from-scratch", full: "--mode proof-from-scratch",
      cli: "--mode proof-from-scratch",
      blurb: "Only the model and the target theorem statement remain; the AI must invent " +
             "the entire proof structure, including any helper lemmas." },
  ],

  // Benchmark page: the eight source cards (canonical benchmark counts; 483 + 231 = 714).
  sources: [
    { id: "tlaplus-examples", name: "Official TLA+ Examples", completion: 379, scratch: 126, total: 505, github: "https://github.com/tlaplus/Examples",
      desc: "The official community TLA+ examples repository — a broad collection of specifications, from teaching exercises to real distributed protocols. Its 505 proof tasks span dozens of individual specs." },
    { id: "tlaps-dist",       name: "TLAPS distribution examples", completion: 103, scratch:  57, total: 160, github: "https://github.com/tlaplus/tlapm" },
    { id: "zookeeper-zab",    name: "ZooKeeper / Zab (Remix)",     completion:   0, scratch:  18, total:  18, github: null },
    { id: "ivy-liveness",     name: "Ivy liveness",                completion:   0, scratch:  12, total:  12, github: null },
    { id: "etcd",             name: "etcd (Specula)",              completion:   0, scratch:   8, total:   8, github: null },
    { id: "abstract-raft",    name: "AbstractRaft (Stephan Merz)", completion:   0, scratch:   4, total:   4, github: null },
    { id: "open-addressing",  name: "OpenAddressing",              completion:   1, scratch:   5, total:   6, github: null },
    { id: "anvil",            name: "Anvil",                       completion:   0, scratch:   1, total:   1, github: null },
  ],

  coverage: [],

  bibtex: `@misc{tlapsbench,
  title  = {TLAPS-Bench: A Benchmark for AI-Written TLAPS Proofs},
  author = {Specula},
  year   = {2026},
  url    = {https://github.com/specula-org/tlaps-bench}
}`,
};
