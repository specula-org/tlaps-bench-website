/* Shared nav + animation utilities */
/* global React */
const { useState, useEffect, useRef } = React;

function useHashRoute(defaultRoute = "home") {
  const [route, setRoute] = useState(() => (location.hash || "#/" + defaultRoute).replace(/^#\//, "") || defaultRoute);
  useEffect(() => {
    const onHash = () => {
      const r = (location.hash || "#/" + defaultRoute).replace(/^#\//, "") || defaultRoute;
      setRoute(r);
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [defaultRoute]);
  return [route, (r) => { location.hash = "#/" + r; }];
}

function FadeIn({ delay = 0, y = 12, children, duration = 600 }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{
      opacity: on ? 1 : 0,
      transform: on ? "translateY(0)" : `translateY(${y}px)`,
      transition: `opacity ${duration}ms cubic-bezier(.2,.7,.2,1) ${delay}ms, transform ${duration}ms cubic-bezier(.2,.7,.2,1) ${delay}ms`,
      willChange: "opacity, transform"
    }}>{children}</div>
  );
}

function useReveal() {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { setRevealed(true); io.disconnect(); } });
    }, { threshold: 0.2 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return [ref, revealed];
}

function Reveal({ children, y = 16, duration = 700, delay = 0 }) {
  const [ref, on] = useReveal();
  return (
    <div ref={ref} style={{
      opacity: on ? 1 : 0,
      transform: on ? "translateY(0)" : `translateY(${y}px)`,
      transition: `opacity ${duration}ms cubic-bezier(.2,.7,.2,1) ${delay}ms, transform ${duration}ms cubic-bezier(.2,.7,.2,1) ${delay}ms`
    }}>{children}</div>
  );
}

function CountUp({ to, duration = 1200, decimals = 0, suffix = "", prefix = "" }) {
  const [val, setVal] = useState(0);
  const [ref, on] = useReveal();
  useEffect(() => {
    if (!on) return;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(eased * to);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [on, to, duration]);
  return <span ref={ref}>{prefix}{val.toFixed(decimals)}{suffix}</span>;
}

function AnimBar({ pct, color, height = 6, bg, delay = 0 }) {
  const [ref, on] = useReveal();
  return (
    <span ref={ref} style={{
      display: "inline-block", width: "100%", height,
      background: bg || "var(--paper-2)", border: "1px solid var(--line)",
      borderRadius: 2, position: "relative", overflow: "hidden", verticalAlign: "middle"
    }}>
      <span style={{
        display: "block", height: "100%", width: on ? pct + "%" : "0%",
        background: color || "var(--accent)",
        transition: `width 900ms cubic-bezier(.2,.7,.2,1) ${delay}ms`
      }} />
    </span>
  );
}

Object.assign(window, { useHashRoute, FadeIn, Reveal, CountUp, AnimBar, useReveal });
