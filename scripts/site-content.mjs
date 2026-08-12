// Hand-maintained page content that the leaderboard pipeline preserves verbatim.
// build-data.mjs spreads this into data.js alongside the generated leaderboard
// (metrics/categories/specs/models). Home, Benchmark, and Cite render from
// these fields.

export const SITE = {
  paper: {
    title: "TLAPS-Bench: Evaluating AI on Writing TLAPS Proofs",
    repo: "https://github.com/specula-org/tlaps-bench",
    overview:
      "TLAPS proofs are checked mechanically by tlapm: a proof is either accepted or " +
      "rejected, with no partial credit and no room for a plausible-but-wrong argument. " +
      "Each property presents a TLA+ theorem whose proof body is replaced by PROOF OBVIOUS; " +
      "the AI must replace it with a real proof that tlapm accepts. That makes proof " +
      "construction a sharp test of an AI's formal reasoning.",
  },

  modes: [
    {
      id: "completion",
      name: "--mode proof-completion",
      full: "--mode proof-completion",
      cli: "--mode proof-completion",
      blurb:
        "The full scaffolding is given, including inductive invariants, lemma decomposition, " +
        "and preceding lemmas marked PROOF OMITTED, and the AI fills in one target proof.",
    },
  ],

  cohorts: [
    {
      id: "one-shot",
      label: "One-Shot",
      blurb:
        "The model gets one response to write the proof. Core modules stay fixed; only the " +
        "marked helper and proof regions in the task file may change. Ranked by Spec-balanced pass rate.",
    },
    {
      id: "agentic",
      label: "Agentic",
      blurb:
        "The model may use tools and take multiple steps to write the proof. Same rules as " +
        "one-shot: Core modules are read-only, and edits stay in the marked task-file regions. " +
        "Ranked by Spec-balanced pass rate.",
    },
  ],

  categories: [
    {
      id: "libraries",
      name: "Example libraries",
      blurb:
        "Specifications and their proof properties from the official TLA+ Examples repository " +
        "and the TLAPS distribution, ranging from teaching exercises to distributed algorithms.",
    },
    {
      id: "systems",
      name: "Systems specifications",
      blurb:
        "Proof properties from protocol and system specifications drawn from ZooKeeper, Ivy, " +
        "etcd, OpenAddressing, and Anvil, emphasizing realistic verification targets.",
    },
  ],

  suites: [
    {
      id: "core",
      label: "Core",
      blurb:
        "Proof Completion Core: 190 proof-completion properties across 56 specifications, " +
        "including the Apalache examples (ben-or83, tendermint). Every published model is graded on this same task set.",
    },
    {
      id: "full",
      label: "Full",
      blurb:
        "Full suite catalog: 710 properties across example libraries and systems specs. " +
        "Published leaderboard scores currently use the Proof Completion Core only.",
    },
  ],

  coverage: [],

  bibtex: `@misc{tlapsbench,
  title  = {TLAPS-Bench: A Benchmark for AI-Written TLAPS Proofs},
  author = {Specula},
  year   = {2026},
  url    = {https://github.com/specula-org/tlaps-bench}
}`,
};
