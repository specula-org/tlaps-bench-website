import { formatTokens, sortedBreakdownRows, nextBreakdownSort } from "./leaderboard-utils.js";

const { useState } = React;
const FAMILY_INFO = Object.fromEntries(TLAPS_DATA.suite.families.map((family) => [family.id, family]));
const toggleSet = (current, id) => {
  const next = new Set(current);
  if (next.has(id)) next.delete(id); else next.add(id);
  return next;
};
const rowClick = (event, action) => {
  if (!event.target.closest("button, a, input, select")) action();
};
const fmt = (value, formatter) => value == null ? "—" : formatter(value);

const RESOURCE_COLUMNS = [
  { key: "totalHours", label: "Total hours" },
  { key: "minutesPerInv", label: "Minutes / inv" },
  { key: "turnsPerInv", label: "Turns / inv" },
  { key: "tokensInOutPerInvM", label: "Tokens in / out per inv (M)" },
  { key: "costPerInvUsd", label: "Cost / inv (USD)" },
  { key: "costUsd", label: "Cost (USD)" },
];

function MetricCells({ metrics }) {
  return RESOURCE_COLUMNS.map((column) => <td key={column.key}
    className={`numeric metric-cell metric-${column.key}`} data-label={column.label} data-metric={column.key}>
    <span className="metric-value">{metrics[column.key]}</span>
  </td>);
}

function metricValue(row, key) {
  if (key === "rate") return row.passed / row.total;
  if (key === "specsInv") return row.total;
  if (key === "name" || key === "level") return row[key];
  const text = row.metrics[key];
  if (key === "tokensInOutPerInvM") return text.split("/").reduce((sum, value) => sum + Number(value.trim()), 0);
  return Number(text.replace(/[$,<]/g, ""));
}

function scoreColor(rate, stops) {
  const position = Math.max(0, Math.min(100, rate)) / 50;
  const index = Math.min(1, Math.floor(position));
  const fraction = position - index;
  const channels = stops[index].map((start, channel) => Math.round(start + (stops[index + 1][channel] - start) * fraction));
  return `rgb(${channels.join(", ")})`;
}

function PassScore({ passed, total, overall = false }) {
  const rate = passed / total * 100;
  const label = Number.isInteger(rate) ? String(rate) : rate.toFixed(1);
  const colors = {
    "--score-ink": scoreColor(rate, [[174, 46, 46], [139, 91, 13], [25, 112, 70]]),
    "--score-fill": scoreColor(rate, [[218, 83, 69], [219, 161, 32], [43, 154, 94]]),
    "--score-bright": scoreColor(rate, [[255, 158, 143], [248, 207, 111], [126, 220, 165]]),
  };
  return <div className={overall ? "pass-score overall-score" : "pass-score spec-pass-score"} style={colors}
    role="img" aria-label={`${label}%: ${passed} of ${total} proved`}>
    <span className="score-badge" aria-hidden="true"><span className="score-dot" /><span className="score-value">{label}<span className="score-unit">%</span></span></span>
    <span className="score-fraction" aria-hidden="true">{passed} / {total}</span>
  </div>;
}

function NameToggle({ open, label, controls, onClick, children }) {
  return <button type="button" className="row-name-toggle" aria-expanded={open} aria-controls={controls}
    aria-label={label} onClick={onClick}>{children}</button>;
}

function TaskFamilyName({ name }) {
  const parenthesis = name.indexOf(" (");
  if (parenthesis < 0) return name;
  return <span>{name.slice(0, parenthesis)}<span className="family-qualifier">{name.slice(parenthesis + 1)}</span></span>;
}

const HEADER_LINES = {
  totalHours: ["Total", "hours"],
  minutesPerInv: ["Minutes", "/ inv"],
  turnsPerInv: ["Turns", "/ inv"],
  tokensInOutPerInvM: ["Tokens in / out", "per inv (M)"],
  costPerInvUsd: ["Cost / inv", "(USD)"],
  costUsd: ["Cost", "(USD)"],
};

function SortHeader({ column, sort, setSort, numeric = false }) {
  const active = sort.key === column.key;
  const [label, unit] = HEADER_LINES[column.key] || [column.label];
  return <th scope="col" className={numeric ? "numeric" : ""}
    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
    <button type="button" className="sort-button" onClick={() => setSort((s) => nextBreakdownSort(s, column.key))}>
      <span className="column-label">{label}{unit && <> <span className="column-unit">{unit}</span></>}</span>
      <span className={active ? "sort-arrow active" : "sort-arrow"} aria-hidden="true">{active && sort.dir === "asc" ? "↑" : "↓"}</span>
    </button>
  </th>;
}

function TableColumns({ kind }) {
  const widths = kind === "models"
    ? [36, 240, 82, 100, 92, 94, 92, 152, 112, 104]
    : [260, 92, 82, 100, 92, 94, 92, 152, 112, 104];
  return <colgroup>{widths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup>;
}

function SortSelect({ label, columns, sort, setSort }) {
  return <div className="mobile-sort">
    <select aria-label={label} value={sort.key} onChange={(e) => setSort((s) => ({ key: e.target.value, dir: s.dir }))}>
      <option value="canonical">Default order</option>
      {columns.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
    </select>
    <button type="button" disabled={sort.key === "canonical"} aria-label={`${label}: ${sort.dir === "asc" ? "descending" : "ascending"}`}
      onClick={() => setSort((s) => nextBreakdownSort(s, s.key))}>{sort.dir === "asc" ? "↑" : "↓"}</button>
  </div>;
}

const UNIT_COLUMNS = [
  { key: "name", label: "Invariant / property" }, { key: "verdict", label: "Result" },
  { key: "obligations", label: "Obligations" }, { key: "helperCount", label: "Helpers used" },
];

function Invariants({ model, group }) {
  const [verdict, setVerdict] = useState("All");
  const [sort, setSort] = useState({ key: "canonical", dir: "asc" });
  const rows = sortedBreakdownRows(group.tasks.filter((task) =>
    verdict === "All" || task.verdict === verdict
  ), sort, (row, key) => row[key]);
  const verdicts = [...new Set(group.tasks.map((task) => task.verdict))].sort();
  return <div className="inv-panel">
    <div className="inv-heading"><h4><TaskFamilyName name={group.name} /></h4><span>{group.total} invariants / properties</span></div>
    <dl className="inv-usage">
      {RESOURCE_COLUMNS.map((column) => <div key={column.key}><dt>{column.label}</dt><dd>{group.metrics[column.key]}</dd></div>)}
    </dl>
    <div className="detail-toolbar inv-toolbar">
      <select aria-label={`Filter ${group.name} results`} value={verdict} onChange={(e) => setVerdict(e.target.value)}>
        <option value="All">All results</option>{verdicts.map((v) => <option key={v}>{v}</option>)}
      </select>
      <SortSelect label={`Sort ${group.name} invariants`} columns={UNIT_COLUMNS} sort={sort} setSort={setSort} />
    </div>
    <table className="inv-table">
      <caption className="sr-only">{model.name}: {group.name} invariant results</caption>
      <thead><tr>{UNIT_COLUMNS.map((column, i) => <SortHeader key={column.key} column={column} sort={sort} setSort={setSort} numeric={i > 1} />)}</tr></thead>
      <tbody>{rows.map((task) => <tr key={task.id}>
        <th scope="row" className="inv-name" data-label="Invariant / property" title={task.id}>{task.name}{group.specCount > 1 && <small className="inv-spec-name">{task.specName}</small>}</th>
        <td data-label="Result"><span className={`verdict verdict-${task.verdict.toLowerCase()}`}>{task.verdict}</span></td>
        <td className="numeric" data-label="Obligations">{fmt(task.obligations, formatTokens)}</td>
        <td className="numeric" data-label="Helpers used">{fmt(task.helperCount, formatTokens)}</td>
      </tr>)}</tbody>
    </table>
    {rows.length === 0 && <p className="empty-results" role="status">No matching invariants.</p>}
  </div>;
}

function ModelDetails({ model }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const [sort, setSort] = useState({ key: "canonical", dir: "asc" });
  const columns = [
    { key: "name", label: "Task family" }, { key: "level", label: "Level" },
    { key: "specsInv", label: "Specs / inv" }, { key: "rate", label: model.name },
    ...RESOURCE_COLUMNS,
  ];
  const groups = sortedBreakdownRows(TLAPS_DATA.taskFamilyOrder.map((id) => model.results.find((result) => result.family === id)).map((result) => ({
    ...FAMILY_INFO[result.family], ...result, id: result.family,
    name: FAMILY_INFO[result.family].displayName || FAMILY_INFO[result.family].name,
    metrics: model.documentMetrics[result.family],
    tasks: model.specs.filter((spec) => spec.family === result.family)
      .flatMap((spec) => spec.tasks.map((task) => ({ ...task, specName: spec.name }))),
  })), sort, metricValue);
  const toggle = (id) => setExpanded((current) => toggleSet(current, id));
  return <div className="model-detail">
    <SortSelect label={`Sort ${model.name} task families`} columns={columns} sort={sort} setSort={setSort} />
    <table className="spec-table document-table">
      <caption className="sr-only">{model.name} task-family metrics</caption>
      <TableColumns kind="families" />
      <thead><tr>
        {columns.map((column, i) => <SortHeader key={column.key} column={column} sort={sort} setSort={setSort} numeric={i > 1} />)}
      </tr></thead>
      <tbody>{groups.map((group) => {
        const open = expanded.has(group.id);
        const panelId = `invariants-${model.id}-${group.id}`;
        return <React.Fragment key={group.id}>
          <tr data-family={group.id} className={"spec-row" + (open ? " is-open" : "")} onClick={(e) => rowClick(e, () => toggle(group.id))}>
            <th scope="row" className="spec-name" data-label="Task family"><NameToggle open={open} label={group.name} controls={panelId} onClick={() => toggle(group.id)}><TaskFamilyName name={group.name} /></NameToggle></th>
            <td className="group-level" data-label="Level">{group.level}</td>
            <td className="numeric scope-cell" data-label="Specs / inv">{group.metrics.specsInv}</td>
            <td className="numeric spec-score" data-label={model.name}><PassScore passed={group.passed} total={group.total} /></td>
            <MetricCells metrics={group.metrics} />
          </tr>
          <tr id={panelId} className="inv-expand-row" hidden={!open}><td colSpan={10}>{open && <Invariants model={model} group={group} />}</td></tr>
        </React.Fragment>;
      })}</tbody>
      <tfoot><tr className="group-total">
        <th scope="row" className="spec-name">Total / average</th>
        <td className="group-level" />
        <td className="numeric scope-cell" data-label="Specs / inv">{model.documentMetrics.total.specsInv}</td>
        <td className="numeric spec-score" data-label={model.name}><PassScore passed={model.passed} total={model.total} /></td>
        <MetricCells metrics={model.documentMetrics.total} />
      </tr></tfoot>
    </table>
  </div>;
}

const MODEL_COLUMNS = [
  { key: "name", label: "Model" }, { key: "specsInv", label: "Specs / inv" },
  { key: "rate", label: "Score" }, ...RESOURCE_COLUMNS,
];

export function ResultsTable({ models }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const [sort, setSort] = useState({ key: "rate", dir: "desc" });
  const rows = sortedBreakdownRows(models.map((model) => ({ ...model, metrics: model.documentMetrics.total })), sort, metricValue);
  const ranks = Object.fromEntries([...models].sort((a, b) => b.passRate - a.passRate).map((m, index) => [m.id, index + 1]));
  const toggle = (id) => setExpanded((current) => toggleSet(current, id));
  return <>
    <SortSelect label="Sort leaderboard" columns={MODEL_COLUMNS} sort={sort} setSort={setSort} />
    <div className="leaderboard-table-wrap">
      <table className="leaderboard-table document-table">
        <caption className="sr-only">Proof-from-scratch leaderboard</caption>
        <TableColumns kind="models" />
        <thead><tr><th scope="col" className="rank-cell">#</th>
          {MODEL_COLUMNS.map((column, i) => <SortHeader key={column.key} column={column} sort={sort} setSort={setSort} numeric={i > 0} />)}
        </tr></thead>
        <tbody>{rows.map((model) => {
          const open = expanded.has(model.id);
          return <React.Fragment key={model.id}>
            <tr className={"model-row" + (open ? " is-open" : "")} onClick={(e) => rowClick(e, () => toggle(model.id))}>
              <td className="rank-cell">{String(ranks[model.id]).padStart(2, "0")}</td>
              <th scope="row" className="model-cell"><NameToggle open={open} label={model.name} controls={`details-${model.id}`} onClick={() => toggle(model.id)}><img src={model.logo} alt="" className="model-logo" />
                <span className="model-identity"><strong>{model.name}</strong><small className="model-config">{model.harness} · {model.effort}</small></span>
              </NameToggle></th>
              <td className="numeric scope-cell" data-label="Specs / inv">{model.metrics.specsInv}</td>
              <td className="rate-cell" data-label="Score"><PassScore passed={model.passed} total={model.total} overall /></td>
              <MetricCells metrics={model.metrics} />
            </tr>
            <tr id={`details-${model.id}`} className="detail-row" hidden={!open}><td colSpan={10}>{open && <ModelDetails model={model} />}</td></tr>
          </React.Fragment>;
        })}</tbody>
      </table>
    </div>
  </>;
}
