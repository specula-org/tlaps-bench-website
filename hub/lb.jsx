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

function HubLeaderboard({ showFilters = true }) {
  const [sort, setSort] = useS_lb({ key: "score", dir: "desc" });
  const [expanded, setExpanded] = useS_lb(null);
  const [orgFilter, setOrgFilter] = useS_lb("All");
  const [kindFilter, setKindFilter] = useS_lb("All");

  const orgs = ["All", ...new Set(TLAPS_DATA.models.map(m => m.org))];

  // sort key forms: "name", "score", or "mode:<id>"
  const getVal = (m, key) => key.startsWith("mode:") ? (m.perMode?.[key.slice(5)] ?? null) : m[key];

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
    setSort(s => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
  };
  const sortCls = (k) => sort.key === k ? "sorted" + (sort.dir === "asc" ? " sorted-asc" : "") : "";
  const scored = TLAPS_DATA.models.filter(m => m.score != null);
  const maxScore = scored.length ? Math.max(...scored.map(m => m.score)) : 100;

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

  const colCount = 3 + TLAPS_DATA.modes.length; // #, Model, [modes], Overall, caret

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
              <option value="base">LLM-Only</option>
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
              {TLAPS_DATA.modes.map(md => {
                const k = "mode:" + md.id;
                return (
                  <th key={md.id} className={sortCls(k)} onClick={() => onSort(k)} style={{ textAlign: "right" }} title={md.full}>
                    {md.name} <span className="sort">▾</span>
                  </th>
                );
              })}
              <th className={sortCls("score")} onClick={() => onSort("score")} style={{ textAlign: "right" }}>Overall <span className="sort">▾</span></th>
              <th style={{ width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => {
              const isOpen = expanded === m.id;
              return (
                <React.Fragment key={m.id}>
                  <tr ref={el => { if (el) rowRefs.current[m.id] = el; else delete rowRefs.current[m.id]; }}
                      className={isOpen ? "expanded" : ""}
                      onClick={() => setExpanded(isOpen ? null : m.id)}>
                    <td className="rank"><span className="rank-slot">{
                      m.score == null ? "—" : i < 3
                        ? <span className={"rank-medal " + ["gold","silver","bronze"][i]}>{i + 1}</span>
                        : i + 1
                    }</span></td>
                    <td>
                      <div className="modelname">
                        <OrgDot org={m.org} logo={m.logo} />
                        <div className="modelname-text">
                          <div className="modelname-main">{m.name}</div>
                          {m.subname && <div className="modelname-sub">{m.subname}</div>}
                        </div>
                      </div>
                    </td>
                    {TLAPS_DATA.modes.map(md => {
                      const v = m.perMode?.[md.id];
                      return (
                        <td key={md.id} style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 13 }}>
                          {v == null ? <span style={{ color: "var(--ink-3)" }}>—</span> : v.toFixed(1)}
                        </td>
                      );
                    })}
                    <td style={{ textAlign: "right" }}>
                      {m.score == null ? <span style={{ color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 12 }}>—</span> : (
                        <span className="scorecell">
                          <span className="bar"><AnimBar pct={(m.score / maxScore) * 100} /></span>
                          <span className="score-num">{m.score.toFixed(1)}</span>
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "center", color: "var(--ink-3)", fontSize: 14, transition: "transform 260ms", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>⌄</td>
                  </tr>
                  <tr className="expand-row">
                    <td colSpan={colCount}>
                      <div className={"expand-body" + (isOpen ? " on" : "")}>
                        <div className="inner">
                          <div className="pad">
                            <div className="eyebrow" style={{ marginBottom: 14 }}>Per-source pass rate — {m.name}</div>
                            <div className="taskbars">
                              {TLAPS_DATA.sources.map((s, si) => {
                                const v = m.perSource?.[s.id];
                                return (
                                  <div className="taskbar" key={s.id}>
                                    <span className="tname">{s.name}</span>
                                    {v == null
                                      ? <span style={{display:"inline-block",width:"100%",height:8}} />
                                      : (isOpen ? <AnimBar pct={v} delay={si * 40} height={8} /> : <span style={{display:"inline-block",width:"100%",height:8}} />)}
                                    <span className="val">{v == null ? "—" : v.toFixed(1)}</span>
                                  </div>
                                );
                              })}
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
