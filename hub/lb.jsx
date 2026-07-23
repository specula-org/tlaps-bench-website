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

function BreakdownUsageCell({ v, format }) {
  if (v == null) {
    return <td className="bd-usage-cell"><span className="bd-usage-na">—</span></td>;
  }
  const isDuration = format === "duration";
  const primary = isDuration
    ? formatDuration(v.activeTimePerTask)
    : formatUsd(v.outputCostPerTask, 4);
  const total = isDuration
    ? formatDuration(v.activeTimeSecs, false)
    : formatUsd(v.outputCostUsd);
  return (
    <td className="bd-usage-cell">
      <span className="bd-usage-value">
        <span>{primary}</span>
        <small>total {total}</small>
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

function MetricCell({ v, metric, usage, max }) {
  if (v == null) {
    return <span className="metric-na">—</span>;
  }
  if (metric.format === "duration") {
    return (
      <span className="metric-value">
        <span className="metric-primary">{formatDuration(v)}</span>
        <span className="metric-secondary">total {formatDuration(usage.activeTimeSecs, false)}</span>
      </span>
    );
  }
  if (metric.format === "usd") {
    return (
      <span className="metric-value">
        <span className="metric-primary">{formatUsd(v, 3)}</span>
        <span className="metric-secondary">total {formatUsd(usage.outputCostUsd)}</span>
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

function TaskBreakdown({ model, selectedMode }) {
  const [taskRows, setTaskRows] = useS_lb(null);
  const [loadError, setLoadError] = useS_lb(null);
  const [query, setQuery] = useS_lb("");
  const [verdict, setVerdict] = useS_lb("All");
  const [sort, setSort] = useS_lb({ key: "benchmark", dir: "asc" });
  const rawMode = selectedMode === "completion" ? "proof-completion" : "proof-from-scratch";
  const modeTaskCount = model.perMode[selectedMode].total;

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
      row.mode === rawMode &&
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
  }, [taskRows, query, rawMode, verdict, sort]);

  const onSort = (key) => setSort((current) => ({
    key,
    dir: current.key === key && current.dir === "asc" ? "desc" : "asc",
  }));
  const sortClass = (key) => sort.key === key
    ? ` task-sorted${sort.dir === "asc" ? " task-sorted-asc" : ""}`
    : "";
  const sortAria = (key) => sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
  const taskColumns = [
    ["benchmark", "Task"],
    ["verdict", "Verdict"],
    ["timeSecs", "Active time"],
    ["outputTokens", "Output tokens"],
    ["outputCostUsd", "Output-only cost"],
  ];
  const taskStatus = loadError
    ? "Task data unavailable"
    : taskRows ? `${rows.length} / ${modeTaskCount} tasks` : "Loading tasks…";

  return (
    <div className="task-detail">
      <div className="task-toolbar">
        <label className="task-search">
          <span className="sr-only">Search tasks</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search task, theorem, or source" />
        </label>
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
                <td><span className={`task-verdict ${row.verdict.toLowerCase()}`}>{row.verdict}</span></td>
                <td className="task-number">{formatDuration(row.timeSecs)}</td>
                <td className="task-number">{formatTokens(row.outputTokens)}</td>
                <td className="task-number">{formatUsd(row.outputCostUsd, 4)}</td>
              </tr>
            ))}
            {!taskRows && !loadError && (
              <tr><td className="task-no-results" colSpan="5">Loading task usage…</td></tr>
            )}
            {loadError && (
              <tr><td className="task-no-results" colSpan="5">Could not load task usage: {loadError}</td></tr>
            )}
            {taskRows && rows.length === 0 && (
              <tr><td className="task-no-results" colSpan="5">No tasks match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HubLeaderboard({ showFilters = true, fixedMode = null }) {
  const metricById = useM_lb(() => Object.fromEntries(TLAPS_DATA.metrics.map(m => [m.id, m])), []);
  const modeBlurb = useM_lb(() => Object.fromEntries(TLAPS_DATA.modes.map(m => [m.id, m.blurb])), []);
  const isInvert = (key) => key.startsWith("metric:") && metricById[key.slice(7)]?.invert;

  const initialMode = fixedMode || "completion";
  const [selectedMode, setSelectedMode] = useS_lb(initialMode);
  const [sort, setSort] = useS_lb({ key: `metric:${initialMode}`, dir: "desc" });
  const [expanded, setExpanded] = useS_lb(null);
  const [detailView, setDetailView] = useS_lb("spec");
  const [kindFilter, setKindFilter] = useS_lb("All");
  const modeLabels = { completion: "Proof completion", scratch: "Proof from scratch" };
  const hasMultipleKinds = new Set(TLAPS_DATA.models.map(m => m.kind)).size > 1;
  const visibleMetrics = useM_lb(() => [
    { ...metricById[selectedMode], name: "Pass rate" },
    metricById.activeTimePerTask,
    metricById.outputCostPerTask,
  ], [metricById, selectedMode]);

  // Sort key forms: "name" or "metric:<id>".
  const getMetricVal = (m, metricId) => {
    if (metricId === "completion" || metricId === "scratch") return m.perMetric?.[metricId] ?? null;
    return m.perMode?.[selectedMode]?.[metricId] ?? null;
  };
  const getVal = (m, key) => key.startsWith("metric:") ? getMetricVal(m, key.slice(7)) : m[key];

  const rows = useM_lb(() => {
    let arr = TLAPS_DATA.models.filter(m => kindFilter === "All" || m.kind === kindFilter);
    arr = [...arr];
    arr.sort((a, b) => {
      const va = getVal(a, sort.key), vb = getVal(b, sort.key);
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "string") return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sort.dir === "asc" ? va - vb : vb - va;
    });
    return arr;
  }, [sort, kindFilter, selectedMode]);

  const selectMode = (mode) => {
    if (mode === selectedMode) return;
    setSelectedMode(mode);
    setExpanded(null);
    setSort({ key: `metric:${mode}`, dir: "desc" });
  };

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
  const metricMax = useM_lb(() => Object.fromEntries(visibleMetrics.map(mt => {
    const vals = TLAPS_DATA.models.map(m => {
      if (mt.id === "completion" || mt.id === "scratch") return m.perMetric?.[mt.id];
      return m.perMode?.[selectedMode]?.[mt.id];
    }).filter(v => v != null);
    return [mt.id, vals.length ? Math.max(...vals) : 100];
  })), [visibleMetrics, selectedMode]);

  // FLIP: slide rows to new positions on sort/filter change.
  const rowRefs = useR_lb({});
  const positionsRef = useR_lb({});
  const lastKeyRef = useR_lb({ k: sort.key, d: sort.dir, mode: selectedMode, kd: kindFilter });
  useLE_lb(() => {
    const oldPositions = positionsRef.current;
    const newPositions = {};
    const refs = rowRefs.current;
    Object.keys(refs).forEach(id => { const el = refs[id]; if (el) newPositions[id] = el.offsetTop; });
    const lk = lastKeyRef.current;
    const changed = lk.k !== sort.key || lk.d !== sort.dir || lk.mode !== selectedMode || lk.kd !== kindFilter;
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
    lastKeyRef.current = { k: sort.key, d: sort.dir, mode: selectedMode, kd: kindFilter };
  });

  const colCount = 3 + visibleMetrics.length; // #, Model, [metric columns], caret

  return (
    <div>
      {fixedMode ? (
        <div className="lb-section-head">
          <div className="lb-section-titlebar">
            <h2 className="lb-section-title">
              <span className="lb-section-badge">{modeLabels[fixedMode]}</span>
              <span className="lb-section-count">
                {TLAPS_DATA.models[0]?.perMode?.[fixedMode]?.total ?? 0} properties
              </span>
            </h2>
            {hasMultipleKinds && (
              <div className="method-select-wrap">
                <select className="method-select" value={kindFilter} onChange={e => setKindFilter(e.target.value)}>
                  <option value="All">All</option>
                  <option value="base">One-Shot</option>
                  <option value="agent">Agent</option>
                </select>
              </div>
            )}
          </div>
          {modeBlurb[fixedMode] && <p className="lb-section-sub">{modeBlurb[fixedMode]}</p>}
        </div>
      ) : showFilters && (
        <div className="leaderboard-controls">
          <span className="eyebrow">Task</span>
          <div className="mode-switch" role="group" aria-label="Benchmark task">
            {TLAPS_DATA.modes.map((mode) => (
              <button key={mode.id} type="button" className={selectedMode === mode.id ? "active" : ""}
                aria-pressed={selectedMode === mode.id} onClick={() => selectMode(mode.id)}>
                {modeLabels[mode.id]} <span>{TLAPS_DATA.models[0]?.perMode?.[mode.id]?.total ?? 0}</span>
              </button>
            ))}
          </div>
          {hasMultipleKinds && (
            <div className="method-select-wrap">
              <select className="method-select" value={kindFilter} onChange={e => setKindFilter(e.target.value)}>
                <option value="All">All</option>
                <option value="base">One-Shot</option>
                <option value="agent">Agent</option>
              </select>
            </div>
          )}
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
              {visibleMetrics.map((mt, i) => {
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
                    {visibleMetrics.map((mt, i) => {
                      const v = getMetricVal(m, mt.id);
                      return (
                        <td key={mt.id} className={(i === 1 || mt.groupStart) ? "lb-gap" : undefined} style={{ textAlign: "right" }}>
                          {v == null ? <span style={{ color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 12 }}>—</span> : (
                            <MetricCell v={v} metric={mt} usage={m.perMode[selectedMode]} max={metricMax[mt.id]} />
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
                                  {detailView === "spec"
                                    ? `${modeLabels[selectedMode]}: usage shows the mean per task with the spec total underneath.`
                                    : `${modeLabels[selectedMode]}: recorded usage for each task in this leaderboard.`}
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
                                      <th className="bd-mode">Pass rate</th>
                                      <th className="bd-usage-head">Active time / task</th>
                                      <th className="bd-usage-head">Output-only cost / task</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {TLAPS_DATA.specs.filter(spec => m.perSpec?.[spec.id]?.[selectedMode]).map(spec => {
                                      const score = m.perSpec[spec.id][selectedMode];
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
                                          <BreakdownCell v={score} isOpen={isOpen} />
                                          <BreakdownUsageCell v={score} format="duration" />
                                          <BreakdownUsageCell v={score} format="usd" />
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (isOpen ? <TaskBreakdown model={m} selectedMode={selectedMode} /> : null)}
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
