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
  const totalTasks = TLAPS_DATA.sources.reduce((a, s) => a + s.total, 0);
  return (
    <div>
      <section className="hero">
        <div className="wrap-narrow">
          <FadeIn>
            <div className="news-banner"><span className="dot" />{totalTasks} proof tasks · checked by tlapm</div>
            <h1>Can AI write proofs that <em>tlapm accepts</em>?</h1>
            <p className="lead">A benchmark for evaluating AI's ability to write TLAPS (TLA+ Proof System) proofs — mechanically checked, accepted or rejected, with no partial credit.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
              <button className="btn primary" onClick={() => go("leaderboard")}>View Leaderboard</button>
              <a className="btn ghost" href="https://github.com/specula-org/tlaps-bench" target="_blank">GitHub</a>
            </div>
            <div className="stats">
              <div><span className="big"><CountUp to={totalTasks} /></span>proof tasks</div>
              <div><span className="big"><CountUp to={TLAPS_DATA.sources.length} /></span>sources</div>
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
              Every accepted proof is also screened by a cheat-checker, so a "pass" means a
              genuine proof — not a weakened theorem or an admitted step.
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
          <p className="lead" style={{ maxWidth: 720 }}>
            Pass rate is the share of scored tasks that pass — the proof must be accepted by
            tlapm and clear the cheat-checker (no admitted steps, smuggled axioms, or weakened
            theorems). A proof that only "passes" by cheating is counted as a failure. Columns
            split by task type; click any row to expand the per-source breakdown, filter by
            organization, or switch between LLM-only and agent runs.
          </p>
        </FadeIn>
        <div style={{ marginTop: 32 }}><HubLeaderboard /></div>
      </div>
    </section>
  );
}

// ============ BENCHMARK (sources + modes + grading) ============
function PageBenchmark() {
  const [open, setOpen] = useS_p(null);
  const gridRef = useR_p(null);
  const [rowOpen, setRowOpen] = useS_p(() => new Set());

  React.useLayoutEffect(() => {
    const compute = () => {
      if (!open || !gridRef.current) { setRowOpen(new Set()); return; }
      const cards = gridRef.current.querySelectorAll(".task-card");
      let openTop = null;
      cards.forEach(c => { if (c.dataset.id === open) openTop = c.offsetTop; });
      if (openTop == null) { setRowOpen(new Set()); return; }
      const ids = new Set();
      cards.forEach(c => { if (Math.abs(c.offsetTop - openTop) < 2) ids.add(c.dataset.id); });
      setRowOpen(ids);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [open]);

  return (
    <>
      <section className="section-tight" style={{ paddingTop: 60 }}>
        <div className="wrap">
          <FadeIn>
            <span className="eyebrow accent">Benchmark</span>
            <h1 style={{ fontSize: 44, marginTop: 10 }}>Inside the benchmark</h1>
            <p className="lead" style={{ maxWidth: 760 }}>
              Every task is a TLA+ theorem whose proof has been replaced by PROOF OBVIOUS. The
              AI must produce a proof body that tlapm mechanically accepts — drawn from eight
              real-world sources.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* sources grid */}
      <section className="section" style={{ background: "var(--paper-2)" }}>
        <div className="wrap">
          <Reveal>
            <h2 style={{ fontSize: 32 }}>Benchmark sources</h2>
            <p className="lead" style={{ fontSize: 17 }}>Click a card to see its task counts and source repository.</p>
          </Reveal>
          <Reveal delay={80}>
            <div className="task-grid" ref={gridRef} style={{ marginTop: 24 }}>
              {TLAPS_DATA.sources.map((s) => {
                const isOpen = open === s.id;
                const inRow = rowOpen.has(s.id);
                return (
                  <div key={s.id} data-id={s.id}
                       className={"task-card" + (isOpen ? " open" : "") + (inRow ? " row-open" : "")}
                       onClick={() => setOpen(isOpen ? null : s.id)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                      <h3 style={{ fontSize: 16, margin: 0 }}>{s.name}</h3>
                      <span className="pill">{s.total}</span>
                    </div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-3)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {s.completion} completion · {s.scratch} from scratch
                    </div>
                    <div className="kv-wrap"><div className="kv-inner"><div className="kv">
                      <span>Completion</span><b>{s.completion}</b>
                      <span>From scratch</span><b>{s.scratch}</b>
                      <span>Total</span><b style={{ color: "var(--accent)" }}>{s.total}</b>
                      {s.github && (
                        <a className="gh" href={s.github} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>
                          <span style={{fontSize:13}}>↗</span> View source on GitHub
                        </a>
                      )}
                    </div></div></div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      {/* two task types */}
      <section className="section">
        <div className="wrap">
          <Reveal>
            <h2 style={{ fontSize: 32 }}>Two task types</h2>
            <p className="lead" style={{ fontSize: 17 }}>How much of the proof is given to the AI before it starts.</p>
          </Reveal>
          <Reveal delay={80}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginTop: 24 }}>
              {TLAPS_DATA.modes.map((md) => (
                <div key={md.id} className="card">
                  <span className="eyebrow accent" style={{ display: "block" }}>{md.cli}</span>
                  <h3 style={{ marginTop: 10 }}>{md.full}</h3>
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
              Each candidate proof is graded inside a Docker sandbox in two passes: tlapm checks
              that the proof is correct, and a cheat-checker confirms it's legitimate — no
              admitted steps, smuggled axioms, or weakened theorems. A proof that "passes" by
              cheating is scored as a failure, not a pass.
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
            New benchmark sources, agents, and bug reports are welcome — open an issue to discuss.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <a className="btn primary" href="https://github.com/specula-org/tlaps-bench" target="_blank">Open a PR</a>
            <a className="btn ghost" href="https://github.com/specula-org/tlaps-bench/blob/main/docs/USAGE.md" target="_blank">Usage guide</a>
          </div>
        </FadeIn>

        <FadeIn delay={160}>
          <hr className="sep" />
          <h2 style={{ fontSize: 28 }}>Cite</h2>
          <p style={{ fontFamily: "var(--serif)", fontSize: 17, lineHeight: 1.7, color: "var(--ink-2)" }}>
            If TLAPS-Bench is useful in your research, please cite it.
          </p>
        </FadeIn>

        <FadeIn delay={280}>
          <div className="card bibbox" style={{ padding: 0, marginTop: 28, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px 8px 14px", borderBottom: "1px solid var(--line-soft)", background: "var(--paper-2)", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.1em", minHeight: 36 }}>
              <span>bibtex</span><CopyBibBtn />
            </div>
            <pre className="code" style={{ borderRadius: 0, border: "none" }}>{TLAPS_DATA.bibtex}</pre>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

Object.assign(window, { PageHome, PageLeaderboard, PageBenchmark, PageCite, Mark, CopyBibBtn, PipelineBanner });
