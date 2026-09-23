import { formatTokens } from "./leaderboard-utils.js";
const { useEffect, useRef, useState } = React;

function SourceUnit({ unit, sourceLines, target = false }) {
  const [open, setOpen] = useState(target);
  return <details className="proof-unit" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary><span>{target ? "Target proof" : unit.name}</span><small>Lines {unit.lineStart}–{unit.lineEnd}</small></summary>
    {open && <pre className="proof-code"><code>{sourceLines.slice(unit.lineStart - 1, unit.lineEnd).join("\n")}</code></pre>}
  </details>;
}

export function ProofViewer({ modelName, task, onClose }) {
  const dialog = useRef(null);
  const [bundle, setBundle] = useState(null);
  const [error, setError] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);

  useEffect(() => {
    const node = dialog.current;
    const previousFocus = document.activeElement;
    node.showModal();
    return () => {
      node.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    fetch(task.proofBundle, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (payload.schemaVersion !== 1 || payload.sourceSha256 !== task.proofSourceSha256 || !payload.units?.[task.id]) {
          throw new Error("The proof file does not match this result.");
        }
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload.source));
        const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
        if (hash !== task.proofSourceSha256) throw new Error("The proof file checksum does not match.");
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(new Blob([payload.source], { type: "text/plain;charset=utf-8" }));
        setDownloadUrl(objectUrl);
        setBundle(payload);
      })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [task.id, task.proofBundle, task.proofSourceSha256]);

  const sourceLines = bundle?.source.split(/\r?\n/) || [];
  const dependencies = bundle ? task.proofUnitIds.filter((id) => id !== task.id).map((id) => bundle.units[id]) : [];
  return <dialog className="proof-dialog" ref={dialog} aria-labelledby="proof-viewer-title" onCancel={onClose} onClose={onClose}
    onClick={(event) => { if (event.target === event.currentTarget) { const box = dialog.current.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose(); } }}>
    <div className="proof-dialog-header">
      <div><p>{modelName} · {task.specName}</p><h3 id="proof-viewer-title">{task.name}</h3></div>
      <button type="button" className="proof-close" onClick={onClose}>Close</button>
    </div>
    <div className="proof-dialog-body">
      <div className="proof-overview">
        <span className={`verdict verdict-${task.verdict.toLowerCase()}`}>{task.verdict}</span>
        <span>{formatTokens(task.proofSize)} proof lines</span>
        {downloadUrl && <a className="proof-download" href={downloadUrl} download={bundle.sourceName}>Download module</a>}
      </div>
      {!bundle && !error && <p className="proof-loading" role="status">Loading proof…</p>}
      {error && <p className="proof-loading" role="alert">Unable to load the proof: {error}</p>}
      {bundle && <>
        <SourceUnit unit={bundle.units[task.id]} sourceLines={sourceLines} target />
        {dependencies.length > 0 && <section className="proof-dependencies">
          <h4>Supporting proofs <span>{dependencies.length}</span></h4>
          {dependencies.map((unit) => <SourceUnit key={unit.id} unit={unit} sourceLines={sourceLines} />)}
        </section>}
      </>}
    </div>
  </dialog>;
}
