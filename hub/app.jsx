import "./anim.jsx";
import "./lb.jsx";
import "../phases/pipeline.jsx";
import "./pages.jsx";

const { useState, useEffect } = React;

function Nav({ route, tweaks, update }) {
  const [navOpen, setNavOpen] = useState(false);
  const links = [
    { id: "home", label: "Home" },
    { id: "leaderboard", label: "Leaderboard" },
    { id: "benchmark", label: "Benchmark" },
    { id: "cite", label: "Contribute" }
  ];
  const themeLabel = tweaks.dark ? "Switch to light" : "Switch to dark";
  useEffect(() => { setNavOpen(false); }, [route]);
  return (
    <div className={"nav" + (navOpen ? " open" : "")}>
      <div className="nav-inner">
        <a className="nav-brand" href="#/home" onClick={() => setNavOpen(false)}>
          <img
            className="nav-brand-logo"
            src="https://github.com/specula-org.png?size=80"
            alt=""
            aria-hidden="true"
          />
          <span className="nav-brand-name">TLAPS-Bench</span>
        </a>
        <div className="nav-right">
          <div className="nav-links" id="site-navigation">
            {links.map(l => (
              <a
                key={l.id}
                className={"nav-link" + (route === l.id ? " active" : "")}
                href={"#/" + l.id}
                aria-current={route === l.id ? "page" : undefined}
                onClick={() => setNavOpen(false)}
              >{l.label}</a>
            ))}
            <a className="nav-cta" href="https://github.com/specula-org/tlaps-bench" target="_blank" onClick={() => setNavOpen(false)}>GitHub</a>
          </div>
          <div className="nav-actions">
            <button className="theme-toggle" title={themeLabel} aria-label={themeLabel} onClick={() => update({ dark: !tweaks.dark })}>
              {tweaks.dark ? "☀" : "☾"}
            </button>
            <button className="nav-toggle" aria-label="Toggle menu" aria-controls="site-navigation" aria-expanded={navOpen} onClick={() => setNavOpen(o => !o)}>
              <span /><span /><span />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [route, go] = useHashRoute("home");
  const [tweaks, setTweaks] = useState(() => {
    try { const saved = localStorage.getItem("tlaps_tweaks"); if (saved) return JSON.parse(saved); } catch (e) {}
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return { ...window.TWEAK_DEFAULTS, dark: prefersDark };
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--accent", tweaks.accent);
    r.setAttribute("data-theme", tweaks.dark ? "dark" : "light");
  }, [tweaks]);

  useEffect(() => {
    const mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = (e) => { if (localStorage.getItem("tlaps_tweaks")) return; setTweaks(t => ({ ...t, dark: e.matches })); };
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

  const ACCENTS = { "#4f8cff": "periwinkle", "#1e88e5": "bright blue", "#0ea5e9": "cyan", "#2f6690": "steel", "#d97757": "terracotta" };

  let Page;
  if (route === "leaderboard") Page = <PageLeaderboard />;
  else if (route === "benchmark") Page = <PageBenchmark />;
  else if (route === "cite") Page = <PageCite />;
  else Page = <PageHome go={go} />;

  return (
    <div data-screen-label={route}>
      <Nav route={route} tweaks={tweaks} update={update} />
      <main>{Page}</main>
      <footer className="site-foot">
        <div className="wrap">
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Mark size={22} />
            <span>TLAPS-Bench · <a href="https://github.com/specula-org" target="_blank">specula-org</a></span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:18}}>
            <a href="https://github.com/specula-org/tlaps-bench" target="_blank">GitHub</a>
            <span className="foot-sep" aria-hidden="true" />
            <span>Released under the MIT License.</span>
          </div>
        </div>
      </footer>

      <div className={"tweaks" + (open ? " open" : "")}>
        <h4>Tweaks</h4>
        <div className="row">
          <label>Accent</label>
          <div className="swatches">
            {Object.keys(ACCENTS).map(hex => (
              <button key={hex} title={ACCENTS[hex]} className={"sw" + (tweaks.accent === hex ? " active" : "")} style={{background:hex}} onClick={() => update({accent:hex})} />
            ))}
          </div>
        </div>
        <div className="row">
          <label>Theme</label>
          <div style={{display:"flex",gap:6}}>
            <button className={"btn" + (!tweaks.dark ? " primary" : "")} style={{flex:1,justifyContent:"center",fontSize:12,padding:"6px 10px"}} onClick={() => update({dark:false})}>Light</button>
            <button className={"btn" + (tweaks.dark ? " primary" : "")} style={{flex:1,justifyContent:"center",fontSize:12,padding:"6px 10px"}} onClick={() => update({dark:true})}>Dark</button>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
