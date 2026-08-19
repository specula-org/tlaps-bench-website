/* global React, TLAPS_DATA, HubLeaderboard, Reveal, CountUp, FadeIn, AnimBar, APipeline */
const { useState: useS_p, useEffect: useE_p, useRef: useR_p, useTransition: useT_p } = React;
const PIPE_NATIVE_WIDTH = 1078;
const PIPE_NATIVE_HEIGHT = 300;

function PipelineBanner() {
  const wrapRef = useR_p(null);
  const [scale, setScale] = useS_p(1);
  const Comp = (typeof window !== "undefined") && window.APipeline;
  useE_p(() => {
    if (!wrapRef.current) return undefined;
    const update = () => { const w = wrapRef.current && wrapRef.current.clientWidth; if (w > 0) setScale(w / PIPE_NATIVE_WIDTH); };
    update();
    if (typeof ResizeObserver !== "undefined") { const ro = new ResizeObserver(update); ro.observe(wrapRef.current); return () => ro.disconnect(); }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  if (!Comp) return <div className="fig-placeholder" style={{ height: PIPE_NATIVE_HEIGHT }}>[ pipeline diagram loading… ]</div>;
  return (
    <div className="phase-host">
      <div className="phase-desktop">
        <div ref={wrapRef} className="phase-fit" style={{ height: PIPE_NATIVE_HEIGHT * scale }}>
          <div className="phase-fit-inner" style={{ transform: `scale(${scale})` }}><Comp /></div>
        </div>
      </div>
      <div className="phase-mobile"><Comp layout="mobile" /></div>
    </div>
  );
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
function PageHome({ go }) {
  const fullSuite = TLAPS_DATA.suites.find((suite) => suite.id === "full");
  const totalTasks = fullSuite.propertyCount;
  const totalSpecs = fullSuite.specCount;
  return (
    <div>
      <section className="hero">
        <div className="wrap-narrow">
          <FadeIn>
            <div className="news-banner"><span className="dot" />{totalTasks} tasks · {totalSpecs} specs</div>
            <h1>The TLAPS Benchmark</h1>
            <p className="lead">
              A benchmark for AI-written TLAPS proofs, checked by tlapm with no partial credit.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
              <button className="btn primary" onClick={() => go("leaderboard")}>View Leaderboard</button>
              <a className="btn ghost" href="https://github.com/specula-org/tlaps-bench" target="_blank">GitHub</a>
            </div>
            <div className="stats">
              <div><span className="big"><CountUp to={totalTasks} /></span>tasks</div>
              <div><span className="big"><CountUp to={totalSpecs} /></span>specs</div>
              <div><span className="big accent">tlapm</span><span className="sub-dim">accept / reject</span></div>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="section-tight" style={{ paddingTop: 20 }}>
        <div className="wrap-narrow" style={{ textAlign: "center" }}>
          <Reveal delay={120}>
            <span className="eyebrow">Overview</span>
            <p style={{ fontFamily: "var(--serif)", fontSize: 18, lineHeight: 1.75, color: "var(--ink)", marginTop: 16, textWrap: "pretty" }}>
              {TLAPS_DATA.paper.overview}
            </p>
            <p style={{ fontFamily: "var(--serif)", fontSize: 18, lineHeight: 1.75, color: "var(--ink-2)", marginTop: 14, textWrap: "pretty" }}>
              Before tlapm runs, a cheat-checker screens each submission. A pass is a real proof,
              not a weakened theorem or an admitted step.
            </p>
          </Reveal>
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
    <section className="section">
      <div className="wrap">
        <FadeIn>
          <span className="eyebrow accent">Results</span>
          <h1 style={{ fontSize: 44, marginTop: 10 }}>Leaderboard</h1>
          <p className="lead">
            All models are scored on the Proof Completion Core (190 tasks, 56 specs). Ranking uses
            Spec-balanced pass rate, so each specification counts equally. Expand a row for the
            full breakdown.
          </p>
        </FadeIn>

        <div className="cohort-switch" role="tablist" aria-label="Result cohort">
          {cohorts.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={uiCohort === c.id}
              className={uiCohort === c.id ? "active" : ""}
              onClick={() => selectCohort(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        {active?.blurb && <p className="cohort-blurb">{active.blurb}</p>}

        <div style={{ marginTop: 48 }}>
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
  const suite = suites.find((s) => s.id === suiteId) || suites[0];
  const specs = suite.specs || [];
  const categories = suite.categories || [];
  const totalSpecs = suite.specCount ?? specs.length;
  const totalTasks = suite.propertyCount ?? specs.reduce((sum, spec) => sum + spec.total, 0);
  const showScratch = false;
  const colSpan = showScratch ? 5 : 4;
  const categoryGridStyle = categories.length === 1
    ? { gridTemplateColumns: "minmax(0, 1fr)" }
    : undefined;

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
                  onClick={() => setSuiteId(s.id)}
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
          <div className="dataset-table-shell">
            <table className={`dataset-table${showScratch ? " dataset-table-with-scratch" : ""}`}>
                <thead>
                  <tr>
                    <th scope="col">Spec</th>
                    <th scope="col">Source</th>
                    <th scope="col" className="dataset-number">Completion tasks</th>
                    {showScratch && (
                      <th scope="col" className="dataset-number">From-scratch tasks</th>
                    )}
                    <th scope="col" className="dataset-number">Total tasks</th>
                  </tr>
                </thead>
                {categories.map((category) => {
                  const rows = specs.filter((spec) => spec.category === category.id);
                  return (
                    <tbody key={category.id} className="dataset-table-section">
                      <tr className="dataset-table-group-row">
                        <th colSpan={colSpan} scope="rowgroup">
                          <span>{category.name}</span>
                          <small>{category.specCount} specs · {category.total} tasks</small>
                        </th>
                      </tr>
                      {rows.map((spec) => (
                        <tr key={`${suite.id}:${category.id}:${spec.id}`}>
                          <th scope="row" className="dataset-spec">
                            {spec.url ? (
                              <a href={spec.url} target="_blank" rel="noopener">{spec.name}<span aria-hidden="true">↗</span></a>
                            ) : spec.name}
                          </th>
                          <td className="dataset-source" data-label="Source">
                            {spec.sourceUrl ? (
                              <a href={spec.sourceUrl} target="_blank" rel="noopener">{spec.sourceName}<span aria-hidden="true">↗</span></a>
                            ) : spec.sourceName}
                          </td>
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
                  );
                })}
            </table>
          </div>
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
              Each candidate runs in a Docker sandbox. A cheat-checker goes first: no admitted
              steps, smuggled axioms, or weakened theorems. If that fails, the verdict is CHEATING
              and tlapm is skipped. Otherwise tlapm checks correctness. Cheating does not count as
              a pass.
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
          <h2 style={{ fontSize: 28 }}>Contribute</h2>
          <p style={{ fontFamily: "var(--serif)", fontSize: 17, lineHeight: 1.7, color: "var(--ink-2)" }}>
            Want to see more models on the leaderboard? Open a pull request on the{" "}
            <a className="link" href="https://github.com/specula-org/tlaps-bench" target="_blank">tlaps-bench</a> repository.
            For how to run the benchmark and add a model, see the{" "}
            <a className="link" href="https://github.com/specula-org/tlaps-bench/blob/main/docs/USAGE.md" target="_blank">usage guide</a>.
          </p>
          <p style={{ fontFamily: "var(--serif)", fontSize: 17, lineHeight: 1.7, color: "var(--ink-2)", marginTop: 12 }}>
            New benchmark sources, agents, and bug reports are welcome, open an issue to discuss.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <a className="btn primary" href="https://github.com/specula-org/tlaps-bench" target="_blank">Open a PR</a>
            <a className="btn ghost" href="https://github.com/specula-org/tlaps-bench/blob/main/docs/USAGE.md" target="_blank">Usage guide</a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

Object.assign(window, { PageHome, PageLeaderboard, PageBenchmark, PageCite, Mark, CopyBibBtn, PipelineBanner });
