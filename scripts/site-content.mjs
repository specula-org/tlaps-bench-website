// Hand-maintained page content that the leaderboard pipeline preserves verbatim.
// build-data.mjs spreads this into data.js alongside the generated leaderboard
// (metrics/categories/specs/models). Home, Benchmark, and Cite render from
// these fields.

export const SITE = {
  paper: {
    title: "TLAPS-Bench: Evaluating AI on Writing TLAPS Proofs",
    repo: "https://github.com/specula-org/tlaps-bench",
    overview:
      "TLAPS proofs are checked by tlapm: accepted or rejected, with no partial credit. " +
      "Each task is a TLA+ theorem whose proof body has been replaced by PROOF OBVIOUS; " +
      "the model must write a proof that tlapm accepts.",
  },

  modes: [
    {
      id: "completion",
      name: "--mode proof-completion",
      full: "--mode proof-completion",
      cli: "--mode proof-completion",
      blurb:
        "Scaffolding is provided — inductive invariants, lemma structure, and earlier lemmas " +
        "marked PROOF OMITTED — and the model fills in one target proof.",
    },
  ],

  cohorts: [
    {
      id: "one-shot",
      label: "One-Shot",
      blurb:
        "One response to write the proof. Core modules stay fixed; only the marked helper and " +
        "proof regions in the task file may change.",
    },
    {
      id: "agentic",
      label: "Agentic",
      blurb:
        "The model can use tools and take multiple steps. Same edit rules as one-shot: Core " +
        "modules are read-only, and changes stay inside the marked task-file regions.",
    },
  ],

  categories: [
    {
      id: "libraries",
      name: "Example libraries",
      blurb:
        "Specs and proof properties from the TLA+ Examples repository, the TLAPS distribution, " +
        "and related teaching and algorithm examples.",
    },
    {
      id: "systems",
      name: "Systems specifications",
      blurb:
        "Protocol and systems specs drawn from sources such as ZooKeeper, Ivy, etcd, " +
        "OpenAddressing, Anvil, and Apalache examples.",
    },
  ],

  suites: [
    {
      id: "core",
      label: "Core",
      blurb:
        "Proof Completion Core: 190 tasks across 56 specs, including Apalache examples " +
        "(ben-or83, tendermint). Every published model is graded on this set.",
    },
    {
      id: "full",
      label: "Full",
      blurb:
        "Full catalog: 951 properties across 71 specs. Leaderboard scores use the Proof " +
        "Completion Core only.",
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
