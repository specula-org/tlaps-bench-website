// Formatting and stable sorting shared with the original leaderboard.
const DEFAULT_BREAKDOWN_SORT = { key: "canonical", dir: "asc" };

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

function sortedBreakdownRows(rows, sort, valueFor) {
  if (sort.key === "canonical") return rows;
  return rows.map((row, canonicalIndex) => ({ row, canonicalIndex })).sort((a, b) => {
    const av = valueFor(a.row, sort.key);
    const bv = valueFor(b.row, sort.key);
    const aMissing = av == null || (typeof av === "number" && Number.isNaN(av));
    const bMissing = bv == null || (typeof bv === "number" && Number.isNaN(bv));
    if (aMissing || bMissing) {
      if (aMissing !== bMissing) return aMissing ? 1 : -1;
      return a.canonicalIndex - b.canonicalIndex;
    }
    const comparison = typeof av === "string"
      ? av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" })
      : av - bv;
    return (sort.dir === "asc" ? comparison : -comparison) || a.canonicalIndex - b.canonicalIndex;
  }).map(({ row }) => row);
}

function nextBreakdownSort(current, key) {
  if (key === "canonical") return DEFAULT_BREAKDOWN_SORT;
  return {
    key,
    dir: current.key === key && current.dir === "asc" ? "desc" : "asc",
  };
}


export { formatDuration, formatCostUsd, formatTokens, formatCompactTokens, formatPercent, sortedBreakdownRows, nextBreakdownSort };
