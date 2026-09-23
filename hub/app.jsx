import "./pages.jsx";

const { useState, useEffect } = React;

function Nav({ tweaks, update }) {
  const themeLabel = tweaks.dark ? "Switch to light" : "Switch to dark";
  return (
    <header className="nav">
      <div className="nav-inner">
        <a className="nav-brand" href="#introduction" aria-label="TLAPS-Bench introduction">
          <img className="nav-brand-logo" src="https://github.com/specula-org.png?size=80" alt="" aria-hidden="true" />
          <span className="nav-brand-name">TLAPS-Bench</span>
        </a>
        <div className="nav-right">
          <a className="nav-cta" href="https://github.com/specula-org/tlaps-bench" target="_blank" rel="noopener noreferrer">GitHub</a>
          <button className="theme-toggle" title={themeLabel} aria-label={themeLabel} onClick={() => update({ dark: !tweaks.dark })}>
            {tweaks.dark ? "☀" : "☾"}
          </button>
        </div>
      </div>
    </header>
  );
}

function App() {
  const [tweaks, setTweaks] = useState(window.INITIAL_TWEAKS);

  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--accent", tweaks.accent);
    r.setAttribute("data-theme", tweaks.dark ? "dark" : "light");
  }, [tweaks]);

  useEffect(() => {
    const mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = (e) => {
      try { if (localStorage.getItem("tlaps_tweaks")) return; } catch (e) {}
      setTweaks(t => ({ ...t, dark: e.matches }));
    };
    mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", onChange) : mq.removeListener(onChange); };
  }, []);

  const update = (patch) => {
    setTweaks(t => {
      const next = { ...t, ...patch };
      try { localStorage.setItem("tlaps_tweaks", JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  useEffect(() => {
    const resolveAnchor = () => {
      const legacy = { "#/home": "introduction", "#/benchmark": "introduction", "#/cite": "introduction", "#/leaderboard": "leaderboard" };
      const target = legacy[window.location.hash] || window.location.hash.slice(1);
      if (target) {
        if (legacy[window.location.hash]) history.replaceState(null, "", `#${target}`);
        document.getElementById(target)?.scrollIntoView();
      }
    };
    resolveAnchor();
    window.addEventListener("hashchange", resolveAnchor);
    return () => window.removeEventListener("hashchange", resolveAnchor);
  }, []);

  return (
    <div data-screen-label="home">
      <Nav tweaks={tweaks} update={update} />
      <main><PageHome /><PageLeaderboard /></main>
      <footer className="site-foot">
        <div className="wrap">
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span className="footer-dot" aria-hidden="true" />
            <span>TLAPS-Bench · <a href="https://github.com/specula-org" target="_blank" rel="noopener noreferrer">specula-org</a></span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:18}}>
            <a href="https://github.com/specula-org/tlaps-bench" target="_blank" rel="noopener noreferrer">GitHub</a>
            <span className="foot-sep" aria-hidden="true" />
            <span>Released under the MIT License.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
