// Count code lines in proof bodies, excluding blank lines and nested TLA+ comments.
export function maskComments(source) {
  const out = [...source];
  const chars = [...source];
  let i = 0, depth = 0, string = false;
  while (i < chars.length) {
    const pair = chars[i] + (chars[i + 1] || "");
    if (depth) {
      if (pair === "(*") { out[i++] = " "; out[i++] = " "; depth++; }
      else if (pair === "*)") { out[i++] = " "; out[i++] = " "; depth--; }
      else { if (chars[i] !== "\r" && chars[i] !== "\n") out[i] = " "; i++; }
    } else if (string) {
      if (chars[i] === "\\") i += 2;
      else if (chars[i] === '"') { string = false; i++; }
      else i++;
    } else if (pair === "\\*") {
      while (i < chars.length && chars[i] !== "\r" && chars[i] !== "\n") out[i++] = " ";
    } else if (pair === "(*") {
      out[i++] = " "; out[i++] = " "; depth = 1;
    } else if (chars[i] === '"') { string = true; i++; }
    else i++;
  }
  return out.join("");
}

export function dependencyClosure(units, id) {
  const seen = new Set(), pending = [id];
  while (pending.length) {
    const current = pending.pop();
    if (seen.has(current)) continue;
    const unit = units[current];
    if (!unit) throw new Error(`Unknown proof dependency: ${current}`);
    seen.add(current);
    pending.push(...unit.dependencies);
  }
  return [...seen].sort((a, b) => units[a].lineStart - units[b].lineStart);
}

export function proofLines(cleanLines, unit) {
  if (unit.proofOmitted || !unit.proofRange) return [];
  const [start, end] = unit.proofRange;
  const lines = [];
  for (let line = start; line <= end; line++) if (cleanLines[line - 1].trim()) lines.push(line);
  return lines;
}
