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
      <td className="bd-cell" data-label="Pass rate">
        <span className="bd-na" title="Not applicable — this spec has no tasks in this mode">—</span>
      </td>
    );
  }
  return (
    <td className="bd-cell" data-label="Pass rate">
      <span className="bd-inner">
        <span className="bd-bar">
          {isOpen ? <AnimBar pct={v.rate} height={6} show />
                  : <span style={{ display: "inline-block", width: "100%", height: 6 }} />}
        </span>
        <span className="bd-rate">{v.rate.toFixed(1)}%</span>
        <span className="bd-num">
          {v.pass}/{v.total}
          {v.partialScope && (
            <em className="scope-partial"
                title={`This run covers ${v.total} of the ${v.canonicalTotal} canonical tasks in this spec.`}>
              {" "}of {v.canonicalTotal}
            </em>
          )}
        </span>
      </span>
    </td>
  );
}

function BreakdownUsageCell({ v, format }) {
  const labels = {
    duration: "Active time / task",
    tokens: "Tokens / task",
    cache: "Cache rate",
    usd: "Price / task",
  };
  if (v == null) {
    return <td className={`bd-usage-cell bd-usage-${format}`} data-label={labels[format]}><span className="bd-usage-na">—</span></td>;
  }
  const values = {
    duration: [formatDuration(v.activeTimePerTask), `total ${formatDuration(v.activeTimeSecs, false)}`],
    tokens: [formatCompactTokens(v.totalTokensPerTask), `total ${formatCompactTokens(v.totalTokens)}`],
    cache: [formatPercent(v.cacheRatePct), `${formatCompactTokens(v.cacheReadInputTokens)} cached`],
    usd: [formatCostUsd(v.equivalentCostPerTask, 4), `total ${formatCostUsd(v.equivalentCostUsd, 2)}`],
  };
  const [primary, secondary] = values[format];
  return (
    <td className={`bd-usage-cell bd-usage-${format}`} data-label={labels[format]}>
      <span className="bd-usage-value">
        <span>{primary}</span>
        <small>{secondary}</small>
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
const formatCostUsd = (value, digits = 2) => formatUsd(value, digits);
const formatTokens = (value) => Math.round(value).toLocaleString("en-US");
const formatCompactTokens = (value) => new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
}).format(Math.round(value));
const formatPercent = (value) => value == null ? "—" : `${value.toFixed(1)}%`;

function PricingNote({ model }) {
  const pricing = model.pricing;
  return (
    <React.Fragment>
      Recorded public-API-equivalent price as of {pricing.asOf}. This is not a subscription bill. {" "}
      <a href={pricing.source} target="_blank" rel="noopener">Pricing source</a>
    </React.Fragment>
  );
}

function ComplexityBreakdown({ model, selectedMode, isOpen }) {
  const bands = model.perComplexity[selectedMode];
  const meta = TLAPS_DATA.complexity;
  const byId = Object.fromEntries(meta.bands.map((band) => [band.id, band]));
  return (
    <div className="bd-scroll lb-breakdown-scroll">
      <table className="breakdown lb-breakdown-table lb-complexity-table">
        <caption className="sr-only">Pass rate and usage by reference-proof length</caption>
        <thead>
          <tr>
            <th>{meta.label}</th>
            <th>Tasks</th>
            <th className="bd-mode">Pass rate</th>
            <th className="bd-usage-head bd-supporting">Active time / task</th>
            <th className="bd-usage-head bd-supporting">Tokens / task</th>
            <th className="bd-usage-head bd-supporting">Cache rate</th>
            <th className="bd-usage-head bd-supporting">Price / task</th>
          </tr>
        </thead>
        <tbody>
          {bands.map((band) => (
            <tr className="bd-row lb-breakdown-row" key={band.id}>
              <td className="bd-name spec-name">
                {byId[band.id].label}
                {byId[band.id].note && <small className="band-note">{byId[band.id].note}</small>}
              </td>
              <td className="lb-breakdown-source lb-complexity-tasks" data-label="Tasks">{band.total}</td>
              <BreakdownCell v={band.rate == null ? null : band} isOpen={isOpen} />
              <BreakdownUsageCell v={band.rate == null ? null : band} format="duration" />
              <BreakdownUsageCell v={band.rate == null ? null : band} format="tokens" />
              <BreakdownUsageCell v={band.rate == null ? null : band} format="cache" />
              <BreakdownUsageCell v={band.rate == null ? null : band} format="usd" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
  const barPct = Math.max(0, Math.min(100, v));
  return (
    <span className="scorecell">
      {metric.bar !== false && <span className="bar"><AnimBar pct={barPct} /></span>}
      <span className="score-num">{v.toFixed(1)}%</span>
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
  const modeTaskCount = model.perMode[selectedMode]?.total ?? 0;

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
          totalTokens: row.input_tokens + row.output_tokens,
          cacheRatePct: row.input_tokens > 0
            ? 100 * row.cache_read_input_tokens / row.input_tokens
            : null,
          equivalentCostUsd: row.equivalent_cost_usd,
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
      // Unrecorded values sort last either way, never as zero.
      if (av == null || bv == null) return av == null ? (bv == null ? 0 : 1) : -1;
      return sort.dir === "asc" ? av - bv : bv - av;
    });
  }, [taskRows, query, rawMode, verdict, sort]);

  const onSort = (key) => setSort((current) => ({
    key,
    dir: current.key === key && current.dir === "asc" ? "desc" : "asc",
  }));
  const selectSort = (key) => setSort((current) => ({
    key,
    dir: current.key === key ? current.dir : "asc",
  }));
  const sortClass = (key) => sort.key === key
    ? ` task-sorted${sort.dir === "asc" ? " task-sorted-asc" : ""}`
    : "";
  const sortAria = (key) => sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
  const taskColumns = [
    ["benchmark", "Task"],
    ["verdict", "Verdict"],
    ["timeSecs", "Active time"],
    ["totalTokens", "Tokens"],
    ["cacheRatePct", "Cache rate"],
    ["equivalentCostUsd", "Price"],
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
        <select className="task-verdict-filter" value={verdict} onChange={(e) => setVerdict(e.target.value)} aria-label="Filter by verdict">
          <option value="All">All verdicts</option>
          <option value="PASS">PASS</option>
          <option value="FAIL">FAIL</option>
          <option value="CHEATING">CHEATING</option>
        </select>
        <label className="task-mobile-sort">
          <span className="sr-only">Sort tasks by</span>
          <select value={sort.key} onChange={(e) => selectSort(e.target.value)} aria-label="Sort tasks by">
            {taskColumns.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <button type="button" className="task-mobile-sort-direction"
          aria-label={`Sort ${sort.dir === "asc" ? "descending" : "ascending"}`}
          title={`Sort ${sort.dir === "asc" ? "descending" : "ascending"}`}
          onClick={() => onSort(sort.key)}>
          <span aria-hidden="true">{sort.dir === "asc" ? "↑" : "↓"}</span>
        </button>
        <span className="task-count" role="status" aria-live="polite">{taskStatus}</span>
      </div>
      <div className="task-pricing-note">
        <PricingNote model={model} />
      </div>
      <div className="task-scroll">
        <table className="task-table">
          <caption className="sr-only">Task verdicts and recorded usage for {model.name} {model.subname}</caption>
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
                <td className="task-name" data-label="Task">
                  <span>{row.theorem}</span>
                  <small>{row.benchmark}</small>
                </td>
                <td className="task-verdict-cell" data-label="Verdict"><span className={`task-verdict ${row.verdict.toLowerCase()}`}>{row.verdict}</span></td>
                <td className="task-number" data-label="Active time">{formatDuration(row.timeSecs)}</td>
                <td className="task-number" data-label="Tokens">{formatTokens(row.totalTokens)}</td>
                <td className="task-number" data-label="Cache rate">{formatPercent(row.cacheRatePct)}</td>
                <td className="task-number" data-label="Price">{formatCostUsd(row.equivalentCostUsd, 4)}</td>
              </tr>
            ))}
            {!taskRows && !loadError && (
              <tr className="task-status-row"><td className="task-no-results" colSpan="6">Loading task usage…</td></tr>
            )}
            {loadError && (
              <tr className="task-status-row"><td className="task-no-results" colSpan="6">Could not load task usage: {loadError}</td></tr>
            )}
            {taskRows && rows.length === 0 && (
              <tr className="task-status-row"><td className="task-no-results" colSpan="6">No tasks match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModelUsageSummary({ model, selectedMode }) {
  const modeUsage = model.perMode?.[selectedMode];
  if (!modeUsage) return null;
  return (
    <div className="usage-summary" aria-label="Supporting usage metrics">
      <div className="usage-summary-item">
        <span className="usage-summary-label">Active time / task</span>
        <span className="usage-summary-value">{formatDuration(modeUsage.activeTimePerTask)}</span>
        <span className="usage-summary-total">total {formatDuration(modeUsage.activeTimeSecs, false)}</span>
      </div>
      <div className="usage-summary-item">
        <span className="usage-summary-label">Tokens</span>
        <span className="usage-summary-value">{formatTokens(modeUsage.totalTokens)}</span>
        <span className="usage-summary-total">input + output</span>
      </div>
      <div className="usage-summary-item">
        <span className="usage-summary-label">Cache rate</span>
        <span className="usage-summary-value">{formatPercent(modeUsage.cacheRatePct)}</span>
        <span className="usage-summary-total">cached input / input</span>
      </div>
      <div className="usage-summary-item">
        <span className="usage-summary-label">Price</span>
        <span className="usage-summary-value">{formatCostUsd(modeUsage.equivalentCostUsd, 2)}</span>
        <span className="usage-summary-total">public API equivalent</span>
      </div>
    </div>
  );
}

function ModelUsageDisclosure({ model, selectedMode }) {
  const modeUsage = model.perMode?.[selectedMode];
  if (!modeUsage) return null;
  return (
    <details className="lb-usage-disclosure">
      <summary>
        <span>Run usage</span>
        <span className="lb-usage-price">
          <small>Price</small>
          <strong>{formatCostUsd(modeUsage.equivalentCostUsd, 2)}</strong>
        </span>
      </summary>
      <ModelUsageSummary model={model} selectedMode={selectedMode} />
    </details>
  );
}

function SpecificationBreakdown({ model, selectedMode, isOpen }) {
  const specs = (
    (TLAPS_DATA.suites || []).find((suite) => suite.id === "core")?.specs
    || TLAPS_DATA.specs
  ).filter((spec) => model.perSpec?.[spec.id]?.[selectedMode]);
  return (
    <div className="bd-scroll lb-breakdown-scroll">
      <table className="breakdown lb-breakdown-table lb-spec-table">
        <caption className="sr-only">Pass rate and usage by specification</caption>
        <thead>
          <tr>
            <th>Spec</th>
            <th>Source</th>
            <th className="bd-mode">Pass rate</th>
            <th className="bd-usage-head bd-supporting">Active time / task</th>
            <th className="bd-usage-head bd-supporting">Tokens / task</th>
            <th className="bd-usage-head bd-supporting">Cache rate</th>
            <th className="bd-usage-head bd-supporting">Price / task</th>
          </tr>
        </thead>
        <tbody>
          {specs.map((spec) => {
            const score = model.perSpec[spec.id][selectedMode];
            return (
              <tr className="bd-row lb-breakdown-row" key={spec.id}>
                <td className="bd-name spec-name" data-label="Spec">
                  {spec.url ? (
                    <a href={spec.url} target="_blank" rel="noopener"
                      onClick={(event) => event.stopPropagation()}>{spec.name}</a>
                  ) : spec.name}
                </td>
                <td className="lb-breakdown-source" data-label="Source">
                  {spec.sourceUrl ? (
                    <a href={spec.sourceUrl} target="_blank" rel="noopener"
                      onClick={(event) => event.stopPropagation()}>{spec.sourceName}</a>
                  ) : spec.sourceName}
                </td>
                <BreakdownCell v={score} isOpen={isOpen} />
                <BreakdownUsageCell v={score} format="duration" />
                <BreakdownUsageCell v={score} format="tokens" />
                <BreakdownUsageCell v={score} format="cache" />
                <BreakdownUsageCell v={score} format="usd" />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ModelDetail({ model, selectedMode, isOpen, detailView, setDetailView }) {
  const hasComplexity = !!model.perComplexity?.[selectedMode];
  const activeView = detailView === "complexity" && !hasComplexity ? "spec" : detailView;
  const modeScore = model.perMode?.[selectedMode];
  const descriptions = {
    spec: "Pass rates for each specification. These values are averaged to produce the leaderboard score.",
    complexity: "Pass rates grouped by the number of steps in the reference proof.",
    task: "Verdicts and recorded usage for each task.",
  };

  return (
    <div className="pad lb-detail">
      <div className="lb-detail-summary" aria-label="Model result summary">
        <span><strong>{modeScore?.pass ?? "—"}</strong> / {modeScore?.total ?? "—"} tasks</span>
        <span><strong>{modeScore?.completeSpecifications ?? "—"}</strong> / {modeScore?.representedSpecifications ?? "—"} specs</span>
      </div>
      <div className="detail-header">
        <div className="detail-tabs" role="group" aria-label="Leaderboard detail view">
          <button className={activeView === "spec" ? "active" : ""} aria-pressed={activeView === "spec"}
            onClick={() => setDetailView("spec")}>By spec</button>
          {hasComplexity && (
            <button className={activeView === "complexity" ? "active" : ""}
              aria-pressed={activeView === "complexity"}
              onClick={() => setDetailView("complexity")}>By complexity</button>
          )}
          <button className={activeView === "task" ? "active" : ""} aria-pressed={activeView === "task"}
            onClick={() => setDetailView("task")}>By task</button>
        </div>
        <p className="detail-caption">{descriptions[activeView]}</p>
      </div>
      {modeScore?.partialScope && model.scope?.reason && (
        <div className="scope-caption">{model.scope.reason}</div>
      )}
      {activeView === "complexity" && hasComplexity && (() => {
        const covered = model.perComplexity[selectedMode].reduce((sum, band) => sum + (band.total || 0), 0);
        const total = modeScore?.total ?? TLAPS_DATA.core?.taskCount;
        if (!(total > 0) || covered >= total) return null;
        return (
          <div className="complexity-partial-note" role="status">
            Partial only — by complexity covers {covered} of {total} Core tasks, not the full suite. Tasks without reference-proof step counts are omitted.
          </div>
        );
      })()}
      {activeView !== "task" && (
        <ModelUsageDisclosure model={model} selectedMode={selectedMode} />
      )}
      {activeView === "complexity" && hasComplexity ? (
        <ComplexityBreakdown model={model} selectedMode={selectedMode} isOpen={isOpen} />
      ) : activeView === "spec" ? (
        <SpecificationBreakdown model={model} selectedMode={selectedMode} isOpen={isOpen} />
      ) : <TaskBreakdown model={model} selectedMode={selectedMode} />}
    </div>
  );
}

function HubLeaderboard({ showFilters = true, fixedMode = null, fixedCohort = null }) {
  const metricById = useM_lb(() => Object.fromEntries(TLAPS_DATA.metrics.map(m => [m.id, m])), []);
  const modeBlurb = useM_lb(() => Object.fromEntries(TLAPS_DATA.modes.map(m => [m.id, m.blurb])), []);
  const isInvert = (key) => key.startsWith("metric:") && metricById[key.slice(7)]?.invert;
  const modelCohort = (m) => m.cohort || (m.kind === "agent" ? "agentic" : "one-shot");

  const initialMode = fixedMode || "completion";
  const [selectedMode, setSelectedMode] = useS_lb(initialMode);
  const [sort, setSort] = useS_lb({ key: `metric:${initialMode}`, dir: "desc" });
  // Each model keeps its own detail view. Hidden details do not mount until the
  // first expansion, which keeps the initial leaderboard small and responsive.
  const [detailState, setDetailState] = useS_lb({});
  const modeLabels = { completion: "Proof completion", scratch: "Proof from scratch" };
  const modeDescriptions = {
    ...modeBlurb,
    completion: "The model receives the theorem and its supporting lemmas, then writes the target proof.",
  };
  const cohortLabels = { "one-shot": "one-shot", agentic: "agentic" };

  useE_lb(() => {
    setDetailState({});
    setSort({ key: `metric:${selectedMode}`, dir: "desc" });
  }, [fixedCohort]);

  // The property count for a mode is a property of the benchmark, not of whoever
  // happens to sort first — read it off any model that actually ran the mode.
  const modeTotal = (mode) =>
    TLAPS_DATA.models.find(m => m.perMode?.[mode])?.perMode[mode].total ?? 0;
  // The score and its two supporting counts stay together before usage data.
  const visibleMetrics = useM_lb(() => [
    metricById[selectedMode],
  ], [metricById, selectedMode]);

  // Sort key forms: "metric:<id>" only (Model column is not sortable).
  const getMetricVal = (m, metricId) => {
    if (metricId === "completion" || metricId === "scratch") return m.perMetric?.[metricId] ?? null;
    return m.perMode?.[selectedMode]?.[metricId] ?? null;
  };
  const getVal = (m, key) => key.startsWith("metric:") ? getMetricVal(m, key.slice(7)) : m[key];

  const rows = useM_lb(() => {
    // A model only appears in a mode it actually ran, and only inside its cohort.
    let arr = TLAPS_DATA.models.filter(m =>
      m.modes.includes(selectedMode) &&
      (!fixedCohort || modelCohort(m) === fixedCohort));
    arr = [...arr];
    arr.sort((a, b) => {
      const va = getVal(a, sort.key), vb = getVal(b, sort.key);
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "string") return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sort.dir === "asc" ? va - vb : vb - va;
    });
    return arr;
  }, [sort, selectedMode, fixedCohort]);
  const primaryRankById = useM_lb(() => Object.fromEntries(
    [...rows]
      .filter((model) => getMetricVal(model, selectedMode) != null)
      .sort((a, b) => {
        const av = getMetricVal(a, selectedMode);
        const bv = getMetricVal(b, selectedMode);
        return bv - av || a.name.localeCompare(b.name) || (a.subname ?? "").localeCompare(b.subname ?? "");
      })
      .map((model, index) => [model.id, index + 1]),
  ), [rows, selectedMode]);

  const selectMode = (mode) => {
    if (mode === selectedMode) return;
    setSelectedMode(mode);
    setDetailState({});
    setSort({ key: `metric:${mode}`, dir: "desc" });
  };

  const closeOpenDetails = () => setDetailState((current) => {
    let changed = false;
    const next = Object.fromEntries(Object.entries(current).map(([id, detail]) => {
      if (detail.open) changed = true;
      return [id, { ...detail, open: false }];
    }));
    return changed ? next : current;
  });

  const onSort = (key) => {
    // Only metric columns are sortable; Model stays in score order.
    if (!key.startsWith("metric:")) return;
    closeOpenDetails();
    setSort(s => {
      if (s.key === key) return { key, dir: s.dir === "desc" ? "asc" : "desc" };
      // any lower-is-better column starts ascending; everything else descending.
      return { key, dir: isInvert(key) ? "asc" : "desc" };
    });
  };
  const sortCls = (k) => sort.key === k ? "sorted" + (sort.dir === "asc" ? " sorted-asc" : "") : "";
  const sortAria = (key) => sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
  const toggleExpanded = (modelId) => setDetailState((current) => {
    const detail = current[modelId] || { open: false, mounted: false, view: "spec" };
    const open = !detail.open;
    return {
      ...current,
      [modelId]: { ...detail, open, mounted: detail.mounted || open },
    };
  });
  const setModelDetailView = (modelId, view) => setDetailState((current) => {
    const detail = current[modelId] || { open: true, mounted: true, view: "spec" };
    return { ...current, [modelId]: { ...detail, view } };
  });
  const metricMax = useM_lb(() => Object.fromEntries(visibleMetrics.map(mt => {
    if (mt.id === "completion" || mt.id === "scratch") return [mt.id, 100];
    const vals = rows.map(m => m.perMode?.[selectedMode]?.[mt.id]).filter(v => v != null);
    return [mt.id, vals.length ? Math.max(...vals) : 100];
  })), [visibleMetrics, selectedMode, rows]);

  // FLIP: slide rows to new positions on sort/filter change.
  const rowRefs = useR_lb({});
  const positionsRef = useR_lb({});
  const lastKeyRef = useR_lb({ k: sort.key, d: sort.dir, mode: selectedMode, cohort: fixedCohort });
  useLE_lb(() => {
    const oldPositions = positionsRef.current;
    const newPositions = {};
    const refs = rowRefs.current;
    Object.keys(refs).forEach(id => { const el = refs[id]; if (el) newPositions[id] = el.offsetTop; });
    const lk = lastKeyRef.current;
    const changed = lk.k !== sort.key || lk.d !== sort.dir || lk.mode !== selectedMode || lk.cohort !== fixedCohort;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion && changed && Object.keys(oldPositions).length > 0) {
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
    lastKeyRef.current = { k: sort.key, d: sort.dir, mode: selectedMode, cohort: fixedCohort };
  });

  const colCount = 6 + visibleMetrics.length;
  const emptyMessage = fixedCohort
    ? `No ${cohortLabels[fixedCohort] || fixedCohort} models scored in this mode yet.`
    : "No models scored in this mode yet.";

  return (
    <div>
      {fixedMode ? (
        <div className="lb-section-head">
          <div className="lb-section-titlebar">
            <h2 className="lb-section-title">
              <span className="lb-section-badge">{modeLabels[fixedMode]}</span>
              <span className="lb-section-count">
                {modeTotal(fixedMode)} tasks
              </span>
            </h2>
          </div>
          {modeDescriptions[fixedMode] && <p className="lb-section-sub">{modeDescriptions[fixedMode]}</p>}
        </div>
      ) : showFilters && (
        <div className="leaderboard-controls">
          <span className="eyebrow">Task</span>
          <div className="mode-switch" role="group" aria-label="Benchmark task">
            {TLAPS_DATA.modes.map((mode) => (
              <button key={mode.id} type="button" className={selectedMode === mode.id ? "active" : ""}
                aria-pressed={selectedMode === mode.id} onClick={() => selectMode(mode.id)}>
                {modeLabels[mode.id]} <span>{modeTotal(mode.id)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="lb-wrap lb-wrap-compact">
        <table className="lb">
          <caption className="sr-only">{modeLabels[selectedMode]} leaderboard</caption>
          <colgroup>
            <col className="lb-rank-col" />
            <col className="lb-model-col" />
            {visibleMetrics.map((metric) => <col key={metric.id} className="lb-metric-col" />)}
            <col className="lb-supporting-col" />
            <col className="lb-supporting-col" />
            <col className="lb-cost-col" />
            <col className="lb-expand-col" />
          </colgroup>
          <thead>
            <tr>
              <th className="rank">#</th>
              <th>Model</th>
              {visibleMetrics.map((mt) => {
                const k = "metric:" + mt.id;
                return (
                  <th key={mt.id} className={sortCls(k) + " lb-metric"}
                      aria-sort={sortAria(k)} style={{ textAlign: "right" }}>
                    <button type="button" className="sort-button th-mode" aria-label={mt.name}
                      onClick={() => onSort(k)}>
                      Spec-balanced <span className="sort" aria-hidden="true">▾</span>
                      {mt.tip && <span className="col-tip" role="tooltip">{mt.tip}</span>}
                    </button>
                  </th>
                );
              })}
              <th className="lb-supporting-head" title="Task-micro: passed Core tasks divided by all Core tasks.">
                Tasks
              </th>
              <th className="lb-supporting-head" title="Specifications where every selected Core task passed.">
                Specs completed
              </th>
              <th className="lb-cost-head" title="Recorded public-API-equivalent price.">Price</th>
              <th style={{ width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr className="lb-empty-row">
                <td colSpan={colCount}>
                  <div className="lb-empty">{emptyMessage}</div>
                </td>
              </tr>
            )}
            {rows.map((m) => {
              const detail = detailState[m.id] || { open: false, mounted: false, view: "spec" };
              const isOpen = detail.open;
              const primaryRank = primaryRankById[m.id];
              const modeScore = m.perMode?.[selectedMode];
              return (
                <React.Fragment key={m.id}>
                  <tr ref={el => { if (el) rowRefs.current[m.id] = el; else delete rowRefs.current[m.id]; }}
                      className={isOpen ? "expanded" : ""}
                      onClick={() => toggleExpanded(m.id)}>
                    <td className="rank"><span className="rank-slot">{
                      !primaryRank ? "—" : (
                        <span className={"rank-medal " + (["gold","silver","bronze"][primaryRank - 1] || "plain")}>{primaryRank}</span>
                      )
                    }</span></td>
                    <td>
                      <div className="modelname">
                        {m.logo && <OrgDot org={m.org} logo={m.logo} />}
                        <div className="modelname-text">
                          <div className="modelname-main">
                            {m.name}
                          </div>
                          {m.subname && <div className="modelname-sub">{m.subname}</div>}
                        </div>
                      </div>
                    </td>
                    {visibleMetrics.map((mt) => {
                      const v = getMetricVal(m, mt.id);
                      return (
                        <td key={mt.id} style={{ textAlign: "right" }}>
                          {v == null ? <span style={{ color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 12 }}>—</span> : (
                            <MetricCell v={v} metric={mt} usage={m.perMode[selectedMode]} max={metricMax[mt.id]} />
                          )}
                        </td>
                      );
                    })}
                    <td className="lb-supporting-cell">
                      {modeScore ? `${modeScore.pass}/${modeScore.total}` : "—"}
                    </td>
                    <td className="lb-supporting-cell">
                      {modeScore?.representedSpecifications
                        ? `${modeScore.completeSpecifications}/${modeScore.representedSpecifications}`
                        : "—"}
                    </td>
                    <td className="lb-cost-cell">
                      <span className="lb-cost-item" title={`Public API equivalent as of ${m.pricing.asOf}`}>
                        <strong>{formatCostUsd(m.usage.equivalentCostUsd, 2)}</strong>
                      </span>
                    </td>
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
                          {detail.mounted && (
                            <ModelDetail model={m} selectedMode={selectedMode} isOpen={isOpen}
                              detailView={detail.view}
                              setDetailView={(view) => setModelDetailView(m.id, view)} />
                          )}
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
