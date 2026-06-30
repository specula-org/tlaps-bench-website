// Shared data for the TLAPS-Bench website. Every page renders from this object.
// Leaderboard — sourced from <tlaps-bench>/docs/leaderboard/leaderboard.csv (pass rates, %).
// All rates are 0..100. perSource keys MUST match sources[].id.

window.TLAPS_DATA = {
  paper: {
    title: "TLAPS-Bench: Evaluating AI on Writing TLAPS Proofs",
    repo:  "https://github.com/specula-org/tlaps-bench",
    // If/when a paper exists, add: venue, arxiv, authors:[...]
    overview:
      "TLAPS proofs are checked mechanically by tlapm: a proof is either accepted or " +
      "rejected, with no partial credit and no room for a plausible-but-wrong argument. " +
      "Each task presents a TLA+ theorem whose proof body is replaced by PROOF OBVIOUS; " +
      "the AI must replace it with a real proof that tlapm accepts. That makes proof " +
      "construction a sharp test of an AI's formal reasoning."
  },

  // Leaderboard middle columns.
  modes: [
    { id: "completion", name: "Completion", full: "Proof completion",
      cli: "--mode auto-complete",
      blurb: "The full scaffolding — inductive invariants, lemma decomposition, and " +
             "preceding lemmas marked PROOF OMITTED — is given, and the AI fills in one " +
             "target proof." },
    { id: "scratch", name: "From scratch", full: "Proof from scratch",
      cli: "--mode synthesis-from-scratch",
      blurb: "Only the model and the target theorem statement remain; the AI must invent " +
             "the entire proof structure, including any helper lemmas." }
  ],

  // Benchmark sources — the per-row breakdown bars and the Benchmark page grid.
  sources: [
    { id: "tlaplus-examples", name: "tlaplus/Examples",            completion: 381, scratch: 126, total: 507, github: "https://github.com/tlaplus/Examples" },
    { id: "tlaps-dist",       name: "TLAPS distribution examples", completion: 154, scratch:  80, total: 234, github: "https://github.com/tlaplus/tlapm" },
    { id: "zookeeper-zab",    name: "ZooKeeper / Zab (Remix)",     completion:   0, scratch:  18, total:  18, github: null },
    { id: "ivy-liveness",     name: "Ivy liveness",                completion:   0, scratch:  12, total:  12, github: null },
    { id: "etcd",             name: "etcd (Specula)",              completion:   0, scratch:   8, total:   8, github: null },
    { id: "abstract-raft",    name: "AbstractRaft (Stephan Merz)", completion:   0, scratch:   4, total:   4, github: null },
    { id: "open-addressing",  name: "OpenAddressing (M. Kuppe)",   completion:   1, scratch:   5, total:   6, github: null },
    { id: "anvil",            name: "Anvil",                       completion:   0, scratch:   1, total:   1, github: null }
  ],

  // Leaderboard rows. REPLACE these placeholders with real results from leaderboard.csv.
  // score = overall pass rate; perMode/perSource = pass rates (%). Use null where a
  // (model, mode/source) was not attempted — it renders as "—".
  models: [
    {
      id: "gpt-5-codex", name: "GPT-5.5 (Codex)", subname: "Codex backend",
      org: "OpenAI", logo: "assets/logos/openai.svg",
      backend: "codex", kind: "agent",
      score: 0,
      perMode:   { completion: 0, scratch: 0 },
      perSource: { "tlaplus-examples": 0, "tlaps-dist": 0, "zookeeper-zab": null,
                   "ivy-liveness": null, "etcd": null, "abstract-raft": null,
                   "open-addressing": 0, "anvil": null }
    },
    {
      id: "claude-opus", name: "Claude Opus 4.8", subname: "Claude Code backend",
      org: "Anthropic", logo: "assets/logos/claude-color.svg",
      backend: "claude-code", kind: "agent",
      score: 0,
      perMode:   { completion: 0, scratch: 0 },
      perSource: { "tlaplus-examples": 0, "tlaps-dist": 0, "zookeeper-zab": null,
                   "ivy-liveness": null, "etcd": null, "abstract-raft": null,
                   "open-addressing": 0, "anvil": null }
    }
  ],

  coverage: [],  // press cards: { url, source, title, author, date, image }. Empty hides the section.

  bibtex: `@misc{tlapsbench,
  title  = {TLAPS-Bench: A Benchmark for AI-Written TLAPS Proofs},
  author = {Specula},
  year   = {2026},
  url    = {https://github.com/specula-org/tlaps-bench}
}`
};
