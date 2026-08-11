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

  // Benchmark page: current published mode (Proof Completion Core only).
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

  // Leaderboard cohorts. One-shot and agentic never share a ranking table.
  cohorts: [
    {
      id: "one-shot",
      label: "One-Shot",
      blurb:
        "Single-response runs ranked by pass rate on the Proof Completion Core. " +
        "Expand a model for per-spec breakdown; task usage and cost stay in the detail views.",
    },
    {
      id: "agentic",
      label: "Agentic",
      blurb:
        "Tool-using agent runs on the same Proof Completion Core, scored separately from one-shot. " +
        "Same pass-rate ranking and per-spec detail, never mixed into the one-shot table.",
    },
  ],

  // Benchmark page source categories. Counts are filled by build-data.mjs.
  categories: [
    {
      id: "libraries",
      name: "Example libraries",
      blurb:
        "Specifications and their proof properties from the official TLA+ Examples repository, " +
        "the TLAPS distribution, and the Apalache examples corpus.",
    },
    {
      id: "systems",
      name: "Systems specifications",
      blurb:
        "Proof properties from protocol and system specifications. None are in the current Core.",
    },
  ],

  // Published suite. Specs/categories are filled by build-data.mjs from core-manifest.json.
  suites: [
    {
      id: "core",
      label: "Core",
      blurb:
        "Proof Completion Core: proof-completion properties across example-library specs, " +
        "including the Apalache examples (ben-or83, tendermint). Every published model is graded on this same task set.",
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
