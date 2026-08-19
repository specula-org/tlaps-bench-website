// Hand-maintained page content that the leaderboard pipeline preserves verbatim.
// build-data.mjs spreads this into data.js alongside the generated leaderboard
// (metrics/categories/specs/models). Home, Benchmark, and Cite render from
// these fields.

export const SITE = {
  paper: {
    title: "TLAPS-Bench: Evaluating AI on Writing TLAPS Proofs",
    repo: "https://github.com/specula-org/tlaps-bench",
    overview:
      "Each proof-completion task presents a TLA+ theorem with one proof removed. " +
      "The model must write a proof that tlapm accepts.",
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
      blurb: "One response per task. The model may change only the target proof.",
    },
    {
      id: "agentic",
      label: "Agentic",
      blurb: "The model may use tools and iterate, but may change only the target proof.",
    },
  ],

  categories: [
    {
      id: "libraries",
      name: "Example libraries",
      blurb:
        "Specs and proof tasks from the TLA+ Examples repository, the TLAPS distribution, " +
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
        "Full catalog: 951 tasks across 120 specs. Leaderboard scores use the Proof " +
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
