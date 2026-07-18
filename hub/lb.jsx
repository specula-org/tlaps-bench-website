/* global React, TLAPS_DATA, AnimBar */
const { useState: useS_lb, useMemo: useM_lb, useRef: useR_lb, useEffect: useE_lb, useLayoutEffect: useLE_lb } = React;

function OrgDot({ org, logo }) {
  const [failed, setFailed] = useS_lb(false);
  const map = { OpenAI: "openai", Anthropic: "anthropic", Google: "google", DeepSeek: "deepseek", Meta: "meta", Alibaba: "alibaba", xAI: "xai", MiniMax: "minimax", Moonshot: "moonshot", Zhipu: "zhipu", GitHub: "github", Specula: "specula" };
  const cls = map[org] || "";
  const letter = (org || "?").slice(0, 1);
  if (logo && !failed) {
    return (<span className="logo-dot has-img"><img src={logo} alt={org} onError={() => setFailed(true)} /></span>);
  }
  return <span className={"logo-dot " + cls}>{letter}</span>;
}

// One spec-table cell for a given benchmark mode. A null stat means the spec has
// no properties in that mode — shown as a neutral dash, never as 0.
function BreakdownCell({ v, isOpen }) {
  // A null stat means the spec has no properties in this mode (a conceptual 0/0) — shown
  // as a neutral dash. A genuine 0% (0 of N properties passed) is a real result, so it keeps
  // its bar and value; only the not-applicable case collapses to a dash.
  if (v == null) {
    return (
      <td className="bd-cell">
        <span className="bd-na" title="Not applicable — this spec has no properties in this mode">—</span>
      </td>
    );
  }
  return (
    <td className="bd-cell">
      <span className="bd-inner">
        <span className="bd-bar">
          {isOpen ? <AnimBar pct={v.rate} height={6} show />
                  : <span style={{ display: "inline-block", width: "100%", height: 6 }} />}
        </span>
        <span className="bd-rate">{v.rate.toFixed(1)}%</span>
        <span className="bd-num">{v.pass}/{v.total}</span>
      </span>
    </td>
  );
}

function formatDuration(totalSecs, includeSeconds = true) {
  const secs = Math.round(totalSecs);
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;
  if (hours > 0) {
    return includeSeconds
      ? `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`
      : `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}

const formatUsd = (value, digits = 2) => `$${value.toFixed(digits)}`;
const formatTokens = (value) => Math.round(value).toLocaleString("en-US");

function MetricCell({ v, metric, model, max }) {
  if (v == null) {
    return <span className="metric-na">—</span>;
  }
  if (metric.format === "duration") {
    return (
      <span className="metric-value">
        <span className="metric-primary">{formatDuration(v)}</span>
        <span className="metric-secondary">total {formatDuration(model.usage.activeTimeSecs, false)}</span>
      </span>
    );
  }
  if (metric.format === "usd") {
    return (
      <span className="metric-value">
        <span className="metric-primary">{formatUsd(v, 3)}</span>
        <span className="metric-secondary">total {formatUsd(model.usage.outputCostUsd)}</span>
      </span>
    );
  }
  return (
    <span className="scorecell">
      {metric.bar !== false && <span className="bar"><AnimBar pct={(v / max) * 100} /></span>}
      <span className="score-num">{v.toFixed(1)}</span>
    </span>
  );
}

function TaskBreakdown({ model }) {
  const [taskRows, setTaskRows] = useS_lb(null);
  const [loadError, setLoadError] = useS_lb(null);
  const [query, setQuery] = useS_lb("");
  const [mode, setMode] = useS_lb("All");
  const [verdict, setVerdict] = useS_lb("All");
  const [sort, setSort] = useS_lb({ key: "benchmark", dir: "asc" });

  useE_lb(() => {
    const controller = new AbortController();
    setTaskRows(null);
    setLoadError(null);
    fetch(`${model.resultsFile}?v=${model.resultsVersion}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (payload.meta?.backend !== model.id || !Array.isArray(payload.results) ||
            payload.results.length !== model.usage.taskCount) {
          throw new Error("result bundle does not match this model and canonical task count");
        }
        setTaskRows(payload.results.map((row) => ({
          id: `${row.mode}:${row.benchmark}`,
          benchmark: row.benchmark,
          theorem: row.theorem,
          source: row.source,
          mode: row.mode,
          verdict: row.check_verdict,
          timeSecs: row.time_secs,
          outputTokens: row.output_tokens,
          outputCostUsd: row.output_tokens * model.pricing.usdPerMillionTokens / 1_000_000,
        })));
      })
      .catch((error) => {
        if (error.name !== "AbortError") setLoadError(error.message);
      });
    return () => controller.abort();
  }, [model.resultsFile, model.resultsVersion]);

  const valueFor = (row, key) => row[key];
  const rows = useM_lb(() => {
    const needle = query.trim().toLowerCase();
    const filtered = (taskRows ?? []).filter((row) =>
      (mode === "All" || row.mode === mode) &&
      (verdict === "All" || row.verdict === verdict) &&
      (!needle || `${row.theorem} ${row.benchmark} ${row.source}`.toLowerCase().includes(needle))
    );
    return [...filtered].sort((a, b) => {
      const av = valueFor(a, sort.key), bv = valueFor(b, sort.key);
      if (typeof av === "string") {
        return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sort.dir === "asc" ? av - bv : bv - av;
    });
  }, [taskRows, query, mode, verdict, sort]);

  const onSort = (key) => setSort((current) => ({
    key,
    dir: current.key === key && current.dir === "asc" ? "desc" : "asc",
  }));
  const sortClass = (key) => sort.key === key
    ? ` task-sorted${sort.dir === "asc" ? " task-sorted-asc" : ""}`
    : "";
  const sortAria = (key) => sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
  const modeLabel = (value) => value === "proof-completion" ? "Completion" : "From scratch";
  const taskColumns = [
    ["benchmark", "Task"],
    ["mode", "Mode"],
    ["verdict", "Verdict"],
    ["timeSecs", "Active time"],
    ["outputTokens", "Output tokens"],
    ["outputCostUsd", "Output-only cost"],
  ];
  const taskStatus = loadError
    ? "Task data unavailable"
    : taskRows ? `${rows.length} / ${model.usage.taskCount} tasks` : "Loading tasks…";

  return (
    <div className="task-detail">
      <div className="task-toolbar">
        <label className="task-search">
          <span className="sr-only">Search tasks</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search task, theorem, or source" />
        </label>
        <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Filter by benchmark mode">
          <option value="All">All modes</option>
          <option value="proof-completion">Proof completion</option>
          <option value="proof-from-scratch">Proof from scratch</option>
        </select>
        <select value={verdict} onChange={(e) => setVerdict(e.target.value)} aria-label="Filter by verdict">
          <option value="All">All verdicts</option>
          <option value="PASS">PASS</option>
          <option value="FAIL">FAIL</option>
          <option value="CHEATING">CHEATING</option>
        </select>
        <span className="task-count" role="status" aria-live="polite">{taskStatus}</span>
      </div>
      <div className="task-pricing-note">
        Output-only estimate at {formatUsd(model.pricing.usdPerMillionTokens, 0)} / 1M output tokens
        ({model.pricing.tier}, as of {model.pricing.asOf}). <a href={model.pricing.source} target="_blank" rel="noopener">Pricing source</a>
      </div>
      <div className="task-scroll">
        <table className="task-table">
          <thead>
            <tr>
              {taskColumns.map(([key, label]) => (
                <th key={key} className={sortClass(key)} aria-sort={sortAria(key)}>
                  <button type="button" className="task-sort-button" onClick={() => onSort(key)}>
                    {label} <span className="sort" aria-hidden="true">▾</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="task-name">
                  <span>{row.theorem}</span>
                  <small>{row.benchmark}</small>
                </td>
                <td><span className="task-mode">{modeLabel(row.mode)}</span></td>
                <td><span className={`task-verdict ${row.verdict.toLowerCase()}`}>{row.verdict}</span></td>
                <td className="task-number">{formatDuration(row.timeSecs)}</td>
                <td className="task-number">{formatTokens(row.outputTokens)}</td>
                <td className="task-number">{formatUsd(row.outputCostUsd, 4)}</td>
              </tr>
            ))}
            {!taskRows && !loadError && (
              <tr><td className="task-no-results" colSpan="6">Loading task usage…</td></tr>
            )}
            {loadError && (
              <tr><td className="task-no-results" colSpan="6">Could not load task usage: {loadError}</td></tr>
            )}
            {taskRows && rows.length === 0 && (
              <tr><td className="task-no-results" colSpan="6">No tasks match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HubLeaderboard({ showFilters = true }) {
  const metricById = useM_lb(() => Object.fromEntries(TLAPS_DATA.metrics.map(m => [m.id, m])), []);
  const isInvert = (key) => key.startsWith("metric:") && metricById[key.slice(7)]?.invert;

  const [sort, setSort] = useS_lb({ key: "metric:completion", dir: "desc" });
  const [expanded, setExpanded] = useS_lb(null);
  const [detailView, setDetailView] = useS_lb("spec");
  const [orgFilter, setOrgFilter] = useS_lb("All");
  const [kindFilter, setKindFilter] = useS_lb("All");

  const orgs = ["All", ...new Set(TLAPS_DATA.models.map(m => m.org))];

  // Sort key forms: "name" or "metric:<id>".
  const getVal = (m, key) => key.startsWith("metric:") ? (m.perMetric?.[key.slice(7)] ?? null) : m[key];

  const rows = useM_lb(() => {
    let arr = TLAPS_DATA.models.filter(m => orgFilter === "All" || m.org === orgFilter);
    arr = arr.filter(m => kindFilter === "All" || m.kind === kindFilter);
    arr = [...arr];
    arr.sort((a, b) => {
      const va = getVal(a, sort.key), vb = getVal(b, sort.key);
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "string") return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sort.dir === "asc" ? va - vb : vb - va;
    });
    return arr;
  }, [sort, orgFilter, kindFilter]);

  const onSort = (key) => {
    setExpanded(null);
    setSort(s => {
      if (s.key === key) return { key, dir: s.dir === "desc" ? "asc" : "desc" };
      // any lower-is-better column starts ascending; everything else descending.
      return { key, dir: isInvert(key) ? "asc" : "desc" };
    });
  };
  const sortCls = (k) => sort.key === k ? "sorted" + (sort.dir === "asc" ? " sorted-asc" : "") : "";
  const sortAria = (key) => sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
  const toggleExpanded = (modelId) => setExpanded((current) => current === modelId ? null : modelId);
  // Each displayed bar scales to that column's own top value.
  const metricMax = useM_lb(() => Object.fromEntries(TLAPS_DATA.metrics.map(mt => {
    const vals = TLAPS_DATA.models.map(m => m.perMetric?.[mt.id]).filter(v => v != null);
    return [mt.id, vals.length ? Math.max(...vals) : 100];
  })), []);

  // FLIP: slide rows to new positions on sort/filter change.
  const rowRefs = useR_lb({});
  const positionsRef = useR_lb({});
  const lastKeyRef = useR_lb({ k: sort.key, d: sort.dir, f: orgFilter, kd: kindFilter });
  useLE_lb(() => {
    const oldPositions = positionsRef.current;
    const newPositions = {};
    const refs = rowRefs.current;
    Object.keys(refs).forEach(id => { const el = refs[id]; if (el) newPositions[id] = el.offsetTop; });
    const lk = lastKeyRef.current;
    const changed = lk.k !== sort.key || lk.d !== sort.dir || lk.f !== orgFilter || lk.kd !== kindFilter;
    if (changed && Object.keys(oldPositions).length > 0) {
      Object.keys(refs).forEach(id => {
        const el = refs[id]; if (!el) return;
        const oldTop = oldPositions[id], newTop = newPositions[id];
        if (oldTop != null && oldTop !== newTop) {
          const delta = oldTop - newTop;
          el.style.transition = "none";
          el.style.transform = `translateY(${delta}px)`;
          el.offsetHeight;
          el.style.transition = "transform 480ms cubic-bezier(0.22, 1, 0.36, 1)";
          el.style.transform = "";
        }
      });
    }
    positionsRef.current = newPositions;
    lastKeyRef.current = { k: sort.key, d: sort.dir, f: orgFilter, kd: kindFilter };
  });

  const colCount = 3 + TLAPS_DATA.metrics.length; // #, Model, [metric columns], caret

  return (
    <div>
      {showFilters && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
          <span className="eyebrow">Filter</span>
          {orgs.map(o => (
            <button key={o} className={"pill" + (orgFilter === o ? " solid" : "")} onClick={() => setOrgFilter(o)}
              style={{ cursor: "pointer", border: orgFilter === o ? undefined : "1px solid var(--line)" }}>{o}</button>
          ))}
          <div className="method-select-wrap">
            <select className="method-select" value={kindFilter} onChange={e => setKindFilter(e.target.value)}>
              <option value="All">All</option>
              <option value="base">One-Shot</option>
              <option value="agent">Agent</option>
            </select>
          </div>
        </div>
      )}
      <div className="lb-wrap">
        <table className="lb">
          <thead>
            <tr>
              <th className="rank">#</th>
              <th className={sortCls("name")} aria-sort={sortAria("name")}>
                <button type="button" className="sort-button" onClick={() => onSort("name")}>
                  Model <span className="sort" aria-hidden="true">▾</span>
                </button>
              </th>
              {TLAPS_DATA.metrics.map((mt, i) => {
                const k = "metric:" + mt.id;
                return (
                  <th key={mt.id} className={sortCls(k) + ((i === 1 || mt.groupStart) ? " lb-gap" : "") + " lb-metric"}
                      aria-sort={sortAria(k)} style={{ textAlign: "right" }}>
                    <button type="button" className="sort-button th-mode" onClick={() => onSort(k)}>
                      {mt.name} <span className="sort" aria-hidden="true">▾</span>
                      {mt.tip && <span className="col-tip" role="tooltip">{mt.tip}</span>}
                    </button>
                  </th>
                );
              })}
              <th style={{ width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr className="lb-empty-row">
                <td colSpan={colCount}>
                  <div className="lb-empty">
                    No models scored in this mode yet — one-shot results are coming soon.
                  </div>
                </td>
              </tr>
            )}
            {rows.map((m, i) => {
              const isOpen = expanded === m.id;
              const hasRankValue = getVal(m, sort.key) != null;
              return (
                <React.Fragment key={m.id}>
                  <tr ref={el => { if (el) rowRefs.current[m.id] = el; else delete rowRefs.current[m.id]; }}
                      className={isOpen ? "expanded" : ""}
                      onClick={() => toggleExpanded(m.id)}>
                    <td className="rank"><span className="rank-slot">{
                      !hasRankValue ? "—" : i < 3
                        ? <span className={"rank-medal " + ["gold","silver","bronze"][i]}>{i + 1}</span>
                        : i + 1
                    }</span></td>
                    <td>
                      <div className="modelname">
                        {m.logo && <OrgDot org={m.org} logo={m.logo} />}
                        <div className="modelname-text">
                          <div className="modelname-main">{m.name}</div>
                          {m.subname && <div className="modelname-sub">{m.subname}</div>}
                        </div>
                      </div>
                    </td>
                    {TLAPS_DATA.metrics.map((mt, i) => {
                      const v = m.perMetric?.[mt.id];
                      return (
                        <td key={mt.id} className={(i === 1 || mt.groupStart) ? "lb-gap" : undefined} style={{ textAlign: "right" }}>
                          {v == null ? <span style={{ color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 12 }}>—</span> : (
                            <MetricCell v={v} metric={mt} model={m} max={metricMax[mt.id]} />
                          )}
                        </td>
                      );
                    })}
                    <td className="expand-cell">
                      <button type="button" className="expand-toggle" aria-expanded={isOpen}
                        aria-controls={`model-detail-${m.id}`}
                        aria-label={`${isOpen ? "Collapse" : "Expand"} ${m.name} ${m.subname} details`}
                        onClick={(event) => { event.stopPropagation(); toggleExpanded(m.id); }}>⌄</button>
                    </td>
                  </tr>
                  <tr className="expand-row">
                    <td colSpan={colCount}>
                      <div id={`model-detail-${m.id}`} className={"expand-body" + (isOpen ? " on" : "")}
                        role="region" aria-label={`${m.name} ${m.subname} details`} aria-hidden={!isOpen}
                        {...(!isOpen ? { inert: "" } : {})}>
                        <div className="inner">
                          <div className="pad">
                            <div className="detail-header">
                              <div>
                                <div className="eyebrow" style={{ marginBottom: 6 }}>{m.name} · {m.subname}</div>
                                <div className="detail-caption">
                                  {detailView === "spec" ? "Counts show passed / total properties." : "Recorded usage for every canonical task."}
                                </div>
                              </div>
                              <div className="detail-tabs" role="group" aria-label="Leaderboard detail view">
                                <button className={detailView === "spec" ? "active" : ""} aria-pressed={detailView === "spec"}
                                  onClick={() => setDetailView("spec")}>By spec</button>
                                <button className={detailView === "task" ? "active" : ""} aria-pressed={detailView === "task"}
                                  onClick={() => setDetailView("task")}>By task</button>
                              </div>
                            </div>
                            {detailView === "spec" ? (
                              /* The benchmark and leaderboard share the same spec-level unit.
                                 A dash marks a mode with no properties, not a failed attempt. */
                              <div className="bd-scroll">
                                <table className="breakdown dataset-score-table">
                                  <thead>
                                    <tr>
                                      <th>Spec</th>
                                      <th>Source</th>
                                      {TLAPS_DATA.metrics.filter(mt => mt.breakdown !== false).map(mt => (
                                        <th key={mt.id} className="bd-mode">{mt.name}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {TLAPS_DATA.specs.map(spec => {
                                      const score = m.perSpec?.[spec.id];
                                      return (
                                        <tr className="bd-row dataset-score-spec-row" key={spec.id}>
                                          <td className="bd-name spec-name">
                                            {spec.url ? (
                                              <a href={spec.url} target="_blank" rel="noopener"
                                                 onClick={(e) => e.stopPropagation()}>{spec.name}</a>
                                            ) : spec.name}
                                          </td>
                                          <td className="dataset-score-source">
                                            {spec.sourceUrl ? (
                                              <a href={spec.sourceUrl} target="_blank" rel="noopener"
                                                 onClick={(e) => e.stopPropagation()}>{spec.sourceName}</a>
                                            ) : spec.sourceName}
                                          </td>
                                          <BreakdownCell v={score?.completion ?? null} isOpen={isOpen} />
                                          <BreakdownCell v={score?.scratch ?? null} isOpen={isOpen} />
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (isOpen ? <TaskBreakdown model={m} /> : null)}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { HubLeaderboard, OrgDot });
