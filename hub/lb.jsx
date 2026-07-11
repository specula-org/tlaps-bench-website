/* global React, TLAPS_DATA, AnimBar */
const { useState: useS_lb, useMemo: useM_lb, useRef: useR_lb, useLayoutEffect: useLE_lb } = React;

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

function HubLeaderboard({ showFilters = true }) {
  const metricById = useM_lb(() => Object.fromEntries(TLAPS_DATA.metrics.map(m => [m.id, m])), []);
  const isInvert = (key) => key.startsWith("metric:") && metricById[key.slice(7)]?.invert;

  const [sort, setSort] = useS_lb({ key: "metric:completion", dir: "desc" });
  const [expanded, setExpanded] = useS_lb(null);
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
  // Each mode column is scored independently; bars scale to that column's own top score.
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
              <th className={sortCls("name")} onClick={() => onSort("name")}>Model <span className="sort">▾</span></th>
              {TLAPS_DATA.metrics.map((mt, i) => {
                const k = "metric:" + mt.id;
                return (
                  <th key={mt.id} className={sortCls(k) + (i > 0 ? " lb-gap" : "")} onClick={() => onSort(k)} style={{ textAlign: "right" }}>
                    <span className="th-mode">
                      {mt.name} <span className="sort">▾</span>
                      {mt.tip && <span className="col-tip" role="tooltip">{mt.tip}</span>}
                    </span>
                  </th>
                );
              })}
              <th style={{ width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => {
              const isOpen = expanded === m.id;
              const hasRankValue = getVal(m, sort.key) != null;
              return (
                <React.Fragment key={m.id}>
                  <tr ref={el => { if (el) rowRefs.current[m.id] = el; else delete rowRefs.current[m.id]; }}
                      className={isOpen ? "expanded" : ""}
                      onClick={() => setExpanded(isOpen ? null : m.id)}>
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
                        <td key={mt.id} className={i > 0 ? "lb-gap" : undefined} style={{ textAlign: "right" }}>
                          {v == null ? <span style={{ color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 12 }}>—</span> : (
                            <span className="scorecell">
                              <span className="bar"><AnimBar pct={(v / metricMax[mt.id]) * 100} /></span>
                              <span className="score-num">{v.toFixed(1)}</span>
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ textAlign: "center", color: "var(--ink-3)", fontSize: 14, transition: "transform 260ms", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>⌄</td>
                  </tr>
                  <tr className="expand-row">
                    <td colSpan={colCount}>
                      <div className={"expand-body" + (isOpen ? " on" : "")}>
                        <div className="inner">
                          <div className="pad">
                            <div className="eyebrow" style={{ marginBottom: 6 }}>Per-spec property pass rate, {m.name}</div>
                            <div style={{ marginBottom: 14, color: "var(--ink-3)", fontSize: 12 }}>
                              Counts show passed / total properties.
                            </div>
                            {/* The benchmark and leaderboard share the same spec-level unit.
                                A dash marks a mode with no properties, not a failed attempt. */}
                            <div className="bd-scroll">
                              <table className="breakdown dataset-score-table">
                                <thead>
                                  <tr>
                                    <th>Spec</th>
                                    <th>Source</th>
                                    {TLAPS_DATA.metrics.map(mt => (
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
