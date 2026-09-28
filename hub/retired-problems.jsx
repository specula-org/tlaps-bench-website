import retiredProblems from "../results/retired-problems.json";

function ProblemName({ problem }) {
  if (!problem.nameParts) return problem.name;
  return problem.nameParts.map((part, index) => part.url
    ? <a key={index} href={part.url} target="_blank" rel="noopener noreferrer">{part.text}</a>
    : <React.Fragment key={index}>{part.text}</React.Fragment>);
}

export function RetiredProblems() {
  return (
    <section className="retired-section" id="retired-problems" aria-labelledby="retired-title">
      <div className="wrap">
        <header className="retired-intro">
          <h2 id="retired-title">{retiredProblems.title}</h2>
          <p className="retired-description">{retiredProblems.description}</p>
          <p className="retired-proof-notice">{retiredProblems.proofNotice}</p>
        </header>
        <div className="retired-table-wrap">
          <table className="retired-table document-table">
            <caption className="sr-only">Retired problems and the models that proved them</caption>
            <colgroup>
              <col className="retired-problem-column" />
              <col className="retired-type-column" />
              <col className="retired-spec-column" />
              <col className="retired-invariant-column" />
              <col className="retired-prover-column" />
            </colgroup>
            <thead><tr>{retiredProblems.columns.map((column, index) =>
              <th key={column} scope="col" className={index === 2 || index === 3 ? "numeric" : undefined}>{column}</th>
            )}</tr></thead>
            <tbody>{retiredProblems.problems.map((problem) => <tr key={problem.name}>
              <th scope="row" className="retired-problem"><ProblemName problem={problem} /></th>
              <td className="retired-type" data-label="Type">{problem.type}</td>
              <td className="numeric retired-specs" data-label="# Spec">{problem.specCount}</td>
              <td className="numeric retired-invariants" data-label="# Invariants">{problem.invariantCount}</td>
              <td className="retired-provers" data-label={retiredProblems.columns[4]}>
                {problem.provedBy.map((prover) =>
                  <span className="retired-prover" key={prover}>{prover}</span>)}
                {problem.provedBy.length === 0 && problem.pendingProofAttribution &&
                  <span className="retired-prover">{problem.pendingProofAttribution}</span>}
              </td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
