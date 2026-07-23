/* global React, TLAPS_DATA, HubLeaderboard, Reveal, CountUp, FadeIn, AnimBar, APipeline */
const { useState: useS_p, useEffect: useE_p, useRef: useR_p } = React;
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
      <div ref={wrapRef} className="phase-fit" style={{ height: PIPE_NATIVE_HEIGHT * scale }}>
        <div className="phase-fit-inner" style={{ transform: `scale(${scale})` }}><Comp /></div>
      </div>
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
  const totalProperties = TLAPS_DATA.specs.reduce((sum, spec) => sum + spec.total, 0);
  const totalSpecs = TLAPS_DATA.specs.length;
  return (
    <div>
      <section className="hero">
        <div className="wrap-narrow">
          <FadeIn>
            <div className="news-banner"><span className="dot" />{totalProperties} proof properties · {totalSpecs} specs · checked by tlapm</div>
            <h1>The TLAPS Benchmark</h1>
            <p className="lead">A benchmark for evaluating AI's ability to write TLAPS (TLA+ Proof System) proofs, 
                mechanically checked, accepted or rejected, with no partial credit.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
              <button className="btn primary" onClick={() => go("leaderboard")}>View Leaderboard</button>
              <a className="btn ghost" href="https://github.com/specula-org/tlaps-bench" target="_blank">GitHub</a>
            </div>
            <div className="stats">
              <div><span className="big"><CountUp to={totalProperties} /></span>proof properties</div>
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
              Every proof is first screened by a cheat-checker before tlapm runs, so a "pass"
              means a genuine proof, not a weakened theorem or an admitted step.
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
  return (
    <section className="section">
      <div className="wrap">
        <FadeIn>
          <span className="eyebrow accent">Results</span>
          <h1 style={{ fontSize: 44, marginTop: 10 }}>Leaderboard</h1>
          <p className="lead" style={{ maxWidth: 820 }}>
            Pass rate is the share of scored properties that pass, where the proof must first clear
            the cheat-checker (no admitted steps, smuggled axioms, or weakened theorems) and then be
            accepted by tlapm. The two benchmark modes, proof-completion and proof-from-scratch, are
            separate leaderboards, shown one after the other below. Each row reports pass rate and
            mean usage for that mode, with the mode's total underneath. Expand a model to compare
            per-spec pass rate, time, and cost or inspect its individual tasks.
          </p>
        </FadeIn>
        <div style={{ marginTop: 32 }}><HubLeaderboard fixedMode="completion" /></div>
        <div style={{ marginTop: 48 }}><HubLeaderboard fixedMode="scratch" /></div>
      </div>
    </section>
  );
}

// ============ BENCHMARK (specs + modes + grading) ============
function PageBenchmark() {
  const totalProperties = TLAPS_DATA.specs.reduce((sum, spec) => sum + spec.total, 0);
  const totalSpecs = TLAPS_DATA.specs.length;

  return (
    <>
      <section className="section-tight" style={{ paddingTop: 60 }}>
        <div className="wrap">
          <FadeIn>
            <span className="eyebrow accent">Benchmark</span>
            <h1 style={{ fontSize: 44, marginTop: 10 }}>Inside the benchmark</h1>
            <p className="lead dataset-intro" style={{ maxWidth: 800 }}>
              The benchmark spans classic TLA+ example libraries and real systems
              specifications. For every property, an AI must replace PROOF OBVIOUS with a proof
              that tlapm mechanically accepts.
            </p>
            <div className="dataset-facts" aria-label="Benchmark size">
              <div className="dataset-fact"><strong>{totalSpecs}</strong><span>specs</span></div>
              <div className="dataset-fact"><strong>{totalProperties}</strong><span>proof properties</span></div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* source categories and per-spec dataset */}
      <section className="section" style={{ background: "var(--paper-2)" }}>
        <div className="wrap">
          <Reveal>
            <h2 style={{ fontSize: 32 }}>Benchmark sources</h2>
            <p className="lead" style={{ fontSize: 17, maxWidth: 780 }}>
              Two complementary kinds of source balance established proof corpora with protocols
              drawn from real systems. Both sets can grow as new specifications are added.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="dataset-category-grid">
              {TLAPS_DATA.categories.map((category, index) => (
                <article key={category.id} className="dataset-category-card">
                  <span className="eyebrow accent">Source category {String(index + 1).padStart(2, "0")}</span>
                  <h3>{category.name}</h3>
                  <p>{category.blurb}</p>
                  <dl className="dataset-category-stats">
                    <div><dt>Specs</dt><dd>{category.specCount}</dd></div>
                    <div><dt>Completion properties</dt><dd>{category.completion || "—"}</dd></div>
                    <div><dt>From-scratch properties</dt><dd>{category.scratch || "—"}</dd></div>
                    <div><dt>Total properties</dt><dd>{category.total}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="dataset-table-header">
              <div>
                <span className="eyebrow">Dataset index</span>
                <h2>All benchmark specs</h2>
              </div>
              <p>
                Each row is one spec, and the numbers are its proof properties. A dash (—)
                means that the spec has no properties for that mode.
              </p>
            </div>
          </Reveal>
          <div className="dataset-table-shell">
            <table className="dataset-table">
                <thead>
                  <tr>
                    <th scope="col">Spec</th>
                    <th scope="col">Source</th>
                    <th scope="col" className="dataset-number">Completion properties</th>
                    <th scope="col" className="dataset-number">From-scratch properties</th>
                    <th scope="col" className="dataset-number">Total properties</th>
                  </tr>
                </thead>
                {TLAPS_DATA.categories.map((category) => {
                  const specs = TLAPS_DATA.specs.filter((spec) => spec.category === category.id);
                  return (
                    <tbody key={category.id} className="dataset-table-section">
                      <tr className="dataset-table-group-row">
                        <th colSpan="5" scope="rowgroup">
                          <span>{category.name}</span>
                          <small>{category.specCount} specs · {category.total} properties</small>
                        </th>
                      </tr>
                      {specs.map((spec) => (
                        <tr key={`${category.id}:${spec.id}`}>
                          <th scope="row" className="dataset-spec">
                            {spec.url ? (
                              <a href={spec.url} target="_blank" rel="noopener">{spec.name}<span aria-hidden="true">↗</span></a>
                            ) : spec.name}
                          </th>
                          <td className="dataset-source">
                            {spec.sourceUrl ? (
                              <a href={spec.sourceUrl} target="_blank" rel="noopener">{spec.sourceName}<span aria-hidden="true">↗</span></a>
                            ) : spec.sourceName}
                          </td>
                          <td className="dataset-number">
                            {spec.completion || <span className="dataset-na" title="No proof-completion properties">—</span>}
                          </td>
                          <td className="dataset-number">
                            {spec.scratch || <span className="dataset-na" title="No proof-from-scratch properties">—</span>}
                          </td>
                          <td className="dataset-number dataset-total">{spec.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  );
                })}
            </table>
          </div>
        </div>
      </section>

      {/* two benchmark modes */}
      <section className="section">
        <div className="wrap">
          <Reveal>
            <h2 style={{ fontSize: 32 }}>Two benchmark modes</h2>
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
              Each candidate proof is graded inside a Docker sandbox as one merged check. The
              cheat-checker runs first and fails fast: it screens for legitimacy — no admitted
              steps, smuggled axioms, or weakened theorems — with no proving required. If a cheat
              is caught, the verdict is CHEATING and tlapm is never run. Only a clean proof reaches
              tlapm, which checks that the proof is correct. A proof that "passes" by cheating is
              scored as a failure, not a pass.
            </p>
          </Reveal>
          <Reveal delay={120}><div style={{ marginTop: 24 }}><PipelineBanner /></div></Reveal>
        </div>
      </section>
    </>
  );
}

// ============ CITE / CONTRIBUTE ============
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
