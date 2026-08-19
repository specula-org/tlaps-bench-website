/* global React, TLAPS_DATA, HubLeaderboard, Reveal, FadeIn, AnimBar, APipeline */
const { useState: useS_p, useTransition: useT_p } = React;

function PipelineBanner() {
  const Comp = (typeof window !== "undefined") && window.APipeline;
  if (!Comp) return <div className="fig-placeholder">[ pipeline diagram loading… ]</div>;
  return <div className="phase-host"><Comp /></div>;
}

function Mark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="mg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--ink)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="9" fill="url(#mg)" />
      <path d="M11 27 L11 13 L20 22 L29 13 L29 27" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx="20" cy="22" r="2.4" fill="#fff" />
    </svg>
  );
}

function CopyBibBtn() {
  const [ok, setOk] = useS_p(false);
  return (
    <button className="copybtn" onClick={(e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(TLAPS_DATA.bibtex).then(() => { setOk(true); setTimeout(() => setOk(false), 1400); });
    }}>{ok ? "✓ copied" : "Copy"}</button>
  );
}

// ============ HOME ============
function PageHome() {
  const fullSuite = TLAPS_DATA.suites.find((suite) => suite.id === "full");
  const totalTasks = fullSuite.propertyCount;
  const totalSpecs = fullSuite.specCount;
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-proof-fragment home-proof-fragment-left" aria-hidden="true">
          THEOREM<br />&nbsp;&nbsp;ASSUME<br />&nbsp;&nbsp;PROVE
        </div>
        <div className="home-proof-fragment home-proof-fragment-right" aria-hidden="true">
          &lt;1&gt;1.<br />&lt;1&gt;2.<br />&lt;1&gt; QED
        </div>

        <div className="home-hero-inner">
          <div className="home-kicker"><span aria-hidden="true" />TLA+ proof benchmark</div>
          <h1>
            <span className="home-headline-line">Can LLMs <em>Prove</em></span>{" "}
            <span className="home-headline-line home-headline-accent">TLA+ Theorems?</span>
          </h1>
          <p className="home-hero-lead">
            TLAPS-Bench evaluates language models on writing TLA+ proofs. Every proof is
            mechanically checked by tlapm.
          </p>
          <div className="home-actions">
            <a className="btn accent" href="#/leaderboard">View Leaderboard</a>
            <a className="btn" href="#/benchmark">Explore Benchmark</a>
            <a className="btn ghost" href="https://github.com/specula-org/tlaps-bench" target="_blank" rel="noopener">GitHub</a>
          </div>
          <div className="home-metrics" aria-label="Benchmark summary">
            <div className="home-metric">
              <strong>{totalTasks}</strong>
              <span>Tasks</span>
            </div>
            <div className="home-metric">
              <strong>{totalSpecs}</strong>
              <span>Specs</span>
            </div>
            <div className="home-metric home-metric-system">
              <strong>TLAPS</strong>
              <span>Proof system</span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-overview">
        <div className="home-overview-inner">
          <span className="eyebrow">Overview</span>
          <div className="home-overview-copy">
            <p>
              {TLAPS_DATA.paper.overview}
            </p>
            <p>
              Before verification, a cheat-checker rejects prohibited edits, including changes
              to the target theorem, new axioms, and model-added admitted steps.
            </p>
          </div>
        </div>
      </section>

      {TLAPS_DATA.coverage && TLAPS_DATA.coverage.length > 0 && (
        <section className="section-tight">
          <div className="wrap">
            <Reveal><div style={{ textAlign: "center", marginBottom: 32 }}><span className="eyebrow accent">In the Press</span></div></Reveal>
            <Reveal delay={80}>
              <div className="coverage-grid">
                {TLAPS_DATA.coverage.map((c) => (
                  <a key={c.url} className="coverage-card" href={c.url} target="_blank" rel="noopener">
                    <div className="coverage-thumb"><img src={c.image} alt="" loading="lazy" /></div>
                    <div className="coverage-body">
                      <div className="coverage-source">{c.source}</div>
                      <h3 className="coverage-title">{c.title}</h3>
                      <div className="coverage-meta"><span>{c.author}</span><span className="coverage-dot">·</span><span>{c.date}</span></div>
                      <span className="coverage-cta">Read <span className="ar">→</span></span>
                    </div>
                  </a>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      )}
    </div>
  );
}

// ============ LEADERBOARD ============
function PageLeaderboard() {
  const cohorts = TLAPS_DATA.cohorts || [
    { id: "one-shot", label: "One-Shot", blurb: "Single-response runs ranked by pass rate." },
    { id: "agentic", label: "Agentic", blurb: "Tool-using agent runs, scored separately." },
  ];
  const [cohort, setCohort] = useS_p(cohorts[0]?.id || "one-shot");
  // Keep the tab chrome snappy: paint the selection immediately, defer the heavy table.
  const [uiCohort, setUiCohort] = useS_p(cohort);
  const [, startTransition] = useT_p();
  const active = cohorts.find((c) => c.id === uiCohort) || cohorts[0];

  const selectCohort = (id) => {
    if (id === uiCohort) return;
    setUiCohort(id);
    startTransition(() => setCohort(id));
  };

  return (
    <section className="section leaderboard-page">
      <div className="wrap">
        <header className="leaderboard-intro">
          <span className="eyebrow accent">Results</span>
          <h1>Leaderboard</h1>
          <p>
            Every model is evaluated on the same 190 proof-completion tasks from 56 specifications.
            Scores are averaged by specification, so larger specifications do not carry more weight.
            Open a model to see how it performed on each specification and task.
          </p>
        </header>

        <div className="leaderboard-cohort-row">
          <div className="cohort-switch" role="group" aria-label="Result cohort">
            {cohorts.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={uiCohort === c.id}
                className={uiCohort === c.id ? "active" : ""}
                onClick={() => selectCohort(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          {active?.blurb && <p className="cohort-blurb">{active.blurb}</p>}
        </div>

        <div className="leaderboard-results">
          <HubLeaderboard fixedMode="completion" fixedCohort={cohort} />
        </div>
      </div>
    </section>
  );
}

// ============ BENCHMARK (specs + modes + grading) ============
function PageBenchmark() {
  const suites = TLAPS_DATA.suites || [
    {
      id: "full",
      label: "Full",
      blurb: "Full benchmark suite.",
      specs: TLAPS_DATA.specs,
      categories: TLAPS_DATA.categories,
      specCount: TLAPS_DATA.specs.length,
      propertyCount: TLAPS_DATA.specs.reduce((sum, spec) => sum + spec.total, 0),
      completion: TLAPS_DATA.specs.reduce((sum, spec) => sum + spec.completion, 0),
      scratch: TLAPS_DATA.specs.reduce((sum, spec) => sum + spec.scratch, 0),
    },
  ];
  const [suiteId, setSuiteId] = useS_p(suites[0]?.id || "core");
  const [specQuery, setSpecQuery] = useS_p("");
  const [openSources, setOpenSources] = useS_p(() => new Set());
  const suite = suites.find((s) => s.id === suiteId) || suites[0];
  const specs = suite.specs || [];
  const categories = suite.categories || [];
  const totalSpecs = suite.specCount ?? specs.length;
  const totalTasks = suite.propertyCount ?? specs.reduce((sum, spec) => sum + spec.total, 0);
  const showScratch = false;
  const categoryGridStyle = categories.length === 1
    ? { gridTemplateColumns: "minmax(0, 1fr)" }
    : undefined;
  const categoriesById = categories.reduce((lookup, category) => {
    lookup[category.id] = category;
    return lookup;
  }, {});
  const sourceGroups = [];
  const sourceGroupsByKey = new Map();

  specs.forEach((spec) => {
    const sourceKey = spec.sourceKey || spec.sourceUrl || spec.sourceName || spec.category || "unknown-source";
    let group = sourceGroupsByKey.get(sourceKey);

    if (!group) {
      group = {
        key: sourceKey,
        domId: `dataset-source-${suite.id}-${sourceGroups.length}`,
        name: spec.sourceName || sourceKey,
        url: spec.sourceUrl,
        categoryIds: [],
        specs: [],
        total: 0,
      };
      sourceGroupsByKey.set(sourceKey, group);
      sourceGroups.push(group);
    }

    if (!group.categoryIds.includes(spec.category)) group.categoryIds.push(spec.category);
    group.specs.push(spec);
    group.total += spec.total || 0;
  });

  const normalizedQuery = specQuery.trim().toLocaleLowerCase();
  const filteredSourceGroups = sourceGroups.map((group) => {
    const categoryNames = group.categoryIds.map((id) => categoriesById[id]?.name || id);
    const groupMatches = `${group.name} ${categoryNames.join(" ")}`.toLocaleLowerCase().includes(normalizedQuery);
    const filteredSpecs = !normalizedQuery || groupMatches
      ? group.specs
      : group.specs.filter((spec) => spec.name.toLocaleLowerCase().includes(normalizedQuery));
    const filteredTasks = filteredSpecs.reduce((sum, spec) => sum + (spec.total || 0), 0);

    return { ...group, categoryNames, filteredSpecs, filteredTasks };
  }).filter((group) => group.filteredSpecs.length > 0);
  const visibleSpecCount = filteredSourceGroups.reduce((sum, group) => sum + group.filteredSpecs.length, 0);

  const selectSuite = (id) => {
    if (id === suiteId) return;
    setSuiteId(id);
    setSpecQuery("");
    setOpenSources(new Set());
  };

  const toggleSource = (key) => {
    setOpenSources((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <>
      <section className="section-tight" style={{ paddingTop: 60 }}>
        <div className="wrap">
          <FadeIn>
            <span className="eyebrow accent">Benchmark</span>
            <h1 style={{ fontSize: 44, marginTop: 10 }}>Inside the benchmark</h1>
            <p className="lead">
              The benchmark covers TLA+ example libraries and systems specs. Each task asks the
              model to replace PROOF OBVIOUS with a proof that tlapm accepts. Switch between the
              Proof Completion Core and the Full catalog below.
            </p>
            <div className="cohort-switch" role="tablist" aria-label="Benchmark suite">
              {suites.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={suiteId === s.id}
                  className={suiteId === s.id ? "active" : ""}
                  onClick={() => selectSuite(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {suite.blurb && <p className="lead" style={{ fontSize: 17, marginTop: 14 }}>{suite.blurb}</p>}
            <div className="dataset-facts" aria-label="Benchmark size">
              <div className="dataset-fact"><strong>{totalSpecs}</strong><span>specs</span></div>
              <div className="dataset-fact"><strong>{totalTasks}</strong><span>tasks</span></div>
              {showScratch ? (
                <>
                  <div className="dataset-fact"><strong>{suite.completion}</strong><span>completion</span></div>
                  <div className="dataset-fact"><strong>{suite.scratch}</strong><span>from scratch</span></div>
                </>
              ) : (
                <div className="dataset-fact"><strong>{suite.completion ?? totalTasks}</strong><span>completion</span></div>
              )}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* source categories and per-spec dataset */}
      <section className="section" style={{ background: "var(--paper-2)" }}>
        <div className="wrap">
          <Reveal>
            <h2 style={{ fontSize: 32 }}>Benchmark sources</h2>
            <p className="lead" style={{ fontSize: 17 }}>
              {suiteId === "core"
                ? "Core tasks come from TLA+ proof corpora, including Apalache examples (ben-or83, tendermint)."
                : "Example libraries plus systems specs. Both sides can grow as new specifications are added."}
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="dataset-category-grid" style={categoryGridStyle}>
              {categories.map((category, index) => (
                <article key={category.id} className="dataset-category-card">
                  <span className="eyebrow accent">Source category {String(index + 1).padStart(2, "0")}</span>
                  <h3>{category.name}</h3>
                  <p>{category.blurb}</p>
                  <dl className={`dataset-category-stats${showScratch ? "" : " dataset-category-stats-compact"}`}>
                    <div><dt>Specs</dt><dd>{category.specCount}</dd></div>
                    <div><dt>Completion tasks</dt><dd>{category.completion || "—"}</dd></div>
                    {showScratch && (
                      <div><dt>From-scratch tasks</dt><dd>{category.scratch || "—"}</dd></div>
                    )}
                    <div><dt>Total tasks</dt><dd>{category.total}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="dataset-table-header">
              <div>
                <span className="eyebrow">Dataset index</span>
                <h2>{suite.label} suite specs</h2>
              </div>
              <p>
                Each row is one spec, and the numbers are its tasks. A dash (—)
                means that the spec has no tasks for that mode.
              </p>
            </div>
          </Reveal>
          <div className="dataset-index-toolbar">
            <div className="dataset-search">
              <label htmlFor={`dataset-search-${suite.id}`}>Search specs</label>
              <div className="dataset-search-field">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <circle cx="8.5" cy="8.5" r="5.5" />
                  <path d="m12.5 12.5 4 4" />
                </svg>
                <input
                  id={`dataset-search-${suite.id}`}
                  type="search"
                  value={specQuery}
                  onChange={(event) => setSpecQuery(event.target.value)}
                  placeholder="Spec, source, or category"
                  autoComplete="off"
                />
                {specQuery && (
                  <button type="button" onClick={() => setSpecQuery("")} aria-label="Clear spec search">Clear</button>
                )}
              </div>
            </div>
            <p className="dataset-result-count" aria-live="polite">
              {normalizedQuery
                ? `${visibleSpecCount} of ${totalSpecs} specs`
                : `${totalSpecs} specs in ${sourceGroups.length} sources`}
            </p>
          </div>

          {filteredSourceGroups.length > 0 ? (
            <div className="dataset-source-list">
              {filteredSourceGroups.map((group) => {
                const isOpen = Boolean(normalizedQuery) || openSources.has(group.key);
                const toggleId = `${group.domId}-toggle`;
                const panelId = `${group.domId}-panel`;

                return (
                  <section key={`${suite.id}:${group.key}`} className={`dataset-source-group${isOpen ? " is-open" : ""}`}>
                    <div className="dataset-source-summary">
                      <button
                        id={toggleId}
                        type="button"
                        className="dataset-source-toggle"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        disabled={Boolean(normalizedQuery)}
                        title={normalizedQuery ? "Clear search to collapse source groups" : undefined}
                        onClick={() => toggleSource(group.key)}
                      >
                        <span className="dataset-source-chevron" aria-hidden="true">
                          <svg viewBox="0 0 16 16"><path d="m5 6 3 3 3-3" /></svg>
                        </span>
                        <span className="dataset-source-identity">
                          <span className="dataset-source-category">{group.categoryNames.join(" · ")}</span>
                          <span className="dataset-source-name">{group.name}</span>
                        </span>
                      </button>

                      <dl className="dataset-source-stats">
                        <div><dt>{normalizedQuery ? "Matches" : "Specs"}</dt><dd>{normalizedQuery ? group.filteredSpecs.length : group.specs.length}</dd></div>
                        <div><dt>Tasks</dt><dd>{normalizedQuery ? group.filteredTasks : group.total}</dd></div>
                      </dl>

                      {group.url && (
                        <a
                          className="dataset-source-repo"
                          href={group.url}
                          target="_blank"
                          rel="noopener"
                          aria-label={`Open ${group.name} source`}
                          title={`Open ${group.name} source`}
                        >
                          <span aria-hidden="true">↗</span>
                        </a>
                      )}
                    </div>

                    <div
                      id={panelId}
                      className="dataset-source-panel"
                      role="region"
                      aria-labelledby={toggleId}
                      hidden={!isOpen}
                    >
                      <table className={`dataset-table${showScratch ? " dataset-table-with-scratch" : ""}`}>
                        <caption className="sr-only">{group.name} specs</caption>
                        <thead>
                          <tr>
                            <th scope="col">Spec</th>
                            <th scope="col" className="dataset-number">Completion tasks</th>
                            {showScratch && (
                              <th scope="col" className="dataset-number">From-scratch tasks</th>
                            )}
                            <th scope="col" className="dataset-number">Total tasks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.filteredSpecs.map((spec) => (
                            <tr key={`${suite.id}:${group.key}:${spec.id}`}>
                              <th scope="row" className="dataset-spec">
                                {spec.url ? (
                                  <a href={spec.url} target="_blank" rel="noopener">{spec.name}<span aria-hidden="true">↗</span></a>
                                ) : spec.name}
                              </th>
                              <td className="dataset-number" data-label="Completion tasks">
                                {spec.completion || <span className="dataset-na" title="No proof-completion tasks">—</span>}
                              </td>
                              {showScratch && (
                                <td className="dataset-number" data-label="From-scratch tasks">
                                  {spec.scratch || <span className="dataset-na" title="No proof-from-scratch tasks">—</span>}
                                </td>
                              )}
                              <td className="dataset-number dataset-total" data-label="Total tasks">{spec.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="dataset-no-results" role="status">
              <strong>No specs match “{specQuery.trim()}”.</strong>
              <button type="button" onClick={() => setSpecQuery("")}>Clear search</button>
            </div>
          )}
        </div>
      </section>

      {/* published mode */}
      <section className="section">
        <div className="wrap">
          <Reveal>
            <h2 style={{ fontSize: 32 }}>Published mode</h2>
            <p className="lead" style={{ fontSize: 17 }}>How much of the proof is given to the AI before it starts.</p>
          </Reveal>
          <Reveal delay={80}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginTop: 24 }}>
              {TLAPS_DATA.modes.map((md) => (
                <div key={md.id} className="card">
                  <span className="eyebrow accent" style={{ display: "block", marginBottom: 12 }}>{md.cli}</span>
                  <p style={{ margin: 0, fontSize: 16 }}>{md.blurb}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* grading pipeline */}
      <section className="section" style={{ background: "var(--paper-2)" }}>
        <div className="wrap">
          <Reveal>
            <h2 style={{ fontSize: 32 }}>How a proof is graded</h2>
            <p className="lead" style={{ fontSize: 17 }}>
              Each submission runs in a Docker sandbox. A cheat-checker first rejects prohibited
              edits, including new axioms, model-added admitted steps, and changes to the target
              theorem. Clean submissions are then checked by tlapm. Only accepted proofs receive
              PASS.
            </p>
          </Reveal>
          <Reveal delay={120}><div style={{ marginTop: 24 }}><PipelineBanner /></div></Reveal>
        </div>
      </section>
    </>
  );
}


function PageCite() {
  return (
    <section className="section">
      <div className="wrap-narrow">
        <FadeIn>
          <h1 style={{ fontSize: 28 }}>Contribute</h1>
          <p style={{ fontFamily: "var(--serif)", fontSize: 17, lineHeight: 1.7, color: "var(--ink-2)" }}>
            Want to see more models on the leaderboard? Open a pull request on the{" "}
            <a className="link" href="https://github.com/specula-org/tlaps-bench" target="_blank">tlaps-bench</a> repository.
            For how to run the benchmark and add a model, see the{" "}
            <a className="link" href="https://github.com/specula-org/tlaps-bench/blob/main/docs/USAGE.md" target="_blank">usage guide</a>.
          </p>
          <p style={{ fontFamily: "var(--serif)", fontSize: 17, lineHeight: 1.7, color: "var(--ink-2)", marginTop: 12 }}>
            Have a benchmark source, agent, or bug report to suggest? Open an issue to discuss it.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <a className="btn primary" href="https://github.com/specula-org/tlaps-bench/compare" target="_blank" rel="noopener">Open a PR</a>
            <a className="btn ghost" href="https://github.com/specula-org/tlaps-bench/blob/main/docs/USAGE.md" target="_blank">Usage guide</a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

Object.assign(window, { PageHome, PageLeaderboard, PageBenchmark, PageCite, Mark, CopyBibBtn, PipelineBanner });
