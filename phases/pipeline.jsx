/* global React */

// One responsive branching diagram of the grading flow. The desktop layout
// places nodes and edges onto a CSS grid, mobile stacks the same DOM in order.

function PLNode({ area, kind, name, role, variant = '' }) {
  return (
    <div className={`pl-node${variant ? ` ${variant}` : ''}`} style={{ gridArea: area }}>
      <span className="pl-kind">{kind}</span>
      <strong className="pl-name">{name}</strong>
      {role && <span className="pl-role">{role}</span>}
    </div>
  );
}

function PLEdge({ area, dir, label }) {
  return (
    <div className={`pl-edge pl-edge-${dir}`} style={{ gridArea: area }}>
      {label && <span className="pl-edge-label">{label}</span>}
    </div>
  );
}

// Groups wrap each branch so mobile shows two visibly separate sections. On
// desktop the group is display:contents, so its nodes join the .pl grid flat.
function PLGroup({ variant, children }) {
  return <div className={`pl-group ${variant}`}>{children}</div>;
}

function APipeline() {
  return (
    <figure className="pl" aria-label="How a candidate proof is graded">
      <figcaption className="sr-only">
        A candidate proof goes to the Cheat-checker. This produces one of two
        separate outcomes. On one branch, the Cheat-checker finds a rule
        violation, the verdict is CHEATING, and tlapm is skipped. On the other
        branch, the submission is clean and goes to tlapm. If tlapm accepts the
        proof the verdict is PASS, otherwise the verdict is FAIL.
      </figcaption>

      <PLGroup variant="pl-group-intro">
        <PLNode area="input" variant="pl-input" kind="Submission" name="Candidate proof" />
        <PLEdge area="e1" dir="h" />
        <PLNode area="gate1" variant="pl-gate" kind="Check" name="Cheat-checker" role="Checks for prohibited edits" />
      </PLGroup>

      <PLGroup variant="pl-group-cheat">
        <PLEdge area="b1" dir="v" label="violation" />
        <PLNode area="cheat" variant="pl-verdict pl-verdict-cheat" kind="Verdict" name="CHEATING" role="A rule was broken, so tlapm never runs" />
      </PLGroup>

      <PLGroup variant="pl-group-clean">
        <PLEdge area="e2" dir="h" label="clean" />
        <PLNode area="gate2" variant="pl-gate" kind="Check" name="tlapm" role="Verifies the proof" />

        <PLEdge area="e3" dir="h" label="accepted" />
        <PLNode area="pass" variant="pl-verdict pl-verdict-pass" kind="Verdict" name="PASS" role="tlapm accepts the proof" />

        <PLEdge area="b2" dir="v" label="not accepted" />
        <PLNode area="fail" variant="pl-verdict pl-verdict-fail" kind="Verdict" name="FAIL" role="tlapm does not accept the proof" />
      </PLGroup>
    </figure>
  );
}

Object.assign(window, { APipeline });
