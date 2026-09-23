import { ResultsTable } from "./leaderboard.jsx";

function PageHome() {
  return (
    <section className="home-hero" id="introduction" aria-labelledby="intro-title">
      <div className="home-hero-inner">
        <div className="home-kicker"><span aria-hidden="true" />Proof from scratch</div>
        <h1 id="intro-title">Can LLMs prove<br /><em>TLA+ specifications?</em></h1>
        <p className="home-hero-lead">{TLAPS_DATA.introduction}</p>
        <div className="home-actions">
          <a className="btn accent" href="#leaderboard">View leaderboard <span aria-hidden="true">↓</span></a>
          <a className="btn" href={TLAPS_DATA.repo} target="_blank" rel="noopener noreferrer">Explore on GitHub <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>
  );
}

function PageLeaderboard() {
  const { cohort } = TLAPS_DATA;
  return (
    <section className="leaderboard-section" id="leaderboard" aria-labelledby="leaderboard-title">
      <div className="wrap">
        <header className="leaderboard-intro">
          <h2 id="leaderboard-title">Leaderboard</h2>
          <p className="leaderboard-lead">Writing proofs from scratch for complex systems: {cohort.taskCount} tasks across {cohort.specCount} specifications.</p>
        </header>
        <ResultsTable models={cohort.models} />
      </div>
    </section>
  );
}

Object.assign(window, { PageHome, PageLeaderboard });
