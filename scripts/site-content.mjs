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

  // Benchmark page: the two mode cards.
  modes: [
    { id: "completion", name: "--mode proof-completion", full: "--mode proof-completion",
      cli: "--mode proof-completion",
      blurb: "The full scaffolding is given, including inductive invariants, lemma decomposition, and preceding lemmas marked PROOF OMITTED, and the AI fills in one target proof." },
    { id: "scratch", name: "--mode proof-from-scratch", full: "--mode proof-from-scratch",
      cli: "--mode proof-from-scratch",
      blurb: "Only the model and the target theorem statement remain; the AI must invent the entire proof structure, including any helper lemmas." },
  ],

  // Leaderboard cohorts. One-shot is the primary published view; agentic is separate.
  cohorts: [
    { id: "one-shot", label: "One-Shot",
      blurb: "Single-response runs ranked by pass rate. Expand a model for per-spec breakdown; task usage and cost stay in the detail views." },
    { id: "agentic", label: "Agentic",
      blurb: "Tool-using agent runs, scored separately from one-shot. Same pass-rate ranking and per-spec detail, never mixed into the one-shot table." },
  ],

  // Benchmark page: the two kinds of source. Counts are deliberately absent
  // here; build-data.mjs derives them from the canonical per-spec manifest.
  categories: [
    { id: "libraries", name: "Example libraries",
      blurb: "Specifications and their proof properties from the official TLA+ Examples repository and the TLAPS distribution, ranging from teaching exercises to distributed algorithms." },
    { id: "systems", name: "Systems specifications",
      blurb: "Proof properties from protocol and system specifications drawn from ZooKeeper, Ivy, etcd, OpenAddressing, and Anvil, emphasizing realistic verification targets." },
  ],

  // Benchmark page suite switch. Specs/categories for each suite are filled in
  // by build-data.mjs (Full = prior 710-task suite; Core = Proof Completion Core).
  suites: [
    { id: "core", label: "Core",
      blurb: "Proof Completion Core: 293 proof-completion properties across example-library specs, including the Apalache examples (ben-or83, tendermint)." },
    { id: "full", label: "Full",
      blurb: "Full suite: 710 properties spanning example libraries and systems specs, with both proof-completion and proof-from-scratch modes." },
  ],

  coverage: [],

  bibtex: `@misc{tlapsbench,
  title  = {TLAPS-Bench: A Benchmark for AI-Written TLAPS Proofs},
  author = {Specula},
  year   = {2026},
  url    = {https://github.com/specula-org/tlaps-bench}
}`,
};
