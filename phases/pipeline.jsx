/* global React */
const P = {
  ink: 'var(--ink)', ink2: 'var(--ink-2)', ink3: 'var(--ink-2)', ink4: 'var(--ink-3)',
  line: 'var(--line)', ok: 'var(--ok)', err: 'var(--err)', accentDeep: 'var(--accent-deep)',
};
const PFS = { caption: 11, body: 12.5, icon: 14, num: 20, hero: 28 };

function PCode({ title, children }) {
  return (
    <div style={{ width: '100%', background: '#fbfcfe', border: `1px solid ${P.line}`, borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ padding: '6px 12px', fontFamily: 'var(--mono)', fontSize: PFS.caption, color: P.ink3, borderBottom: `1px solid ${P.line}`, background: '#f5f7fb' }}>{title}</div>
      <pre style={{ margin: 0, padding: '12px 14px', fontFamily: 'var(--mono)', fontSize: PFS.body, lineHeight: 1.55, color: P.ink2, whiteSpace: 'pre' }}>{children}</pre>
    </div>
  );
}
function PArrow({ label, sub, w = 70, dashed = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: w, flexShrink: 0 }}>
      {label && <div style={{ fontSize: PFS.caption, color: P.ink3, fontFamily: 'var(--mono)', marginBottom: 4 }}>{label}</div>}
      <svg width={w} height={20} viewBox={`0 0 ${w} 20`}>
        <line x1={2} y1={10} x2={w - 10} y2={10} stroke={P.ink3} strokeWidth={1.5} strokeDasharray={dashed ? "4 3" : undefined} />
        <path d={`M${w - 10} 5 L${w - 3} 10 L${w - 10} 15`} fill="none" stroke={P.ink3} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      {sub && <div style={{ fontSize: 10, color: P.ink3, fontFamily: 'var(--mono)', fontStyle: 'italic', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const P_WARN = 'var(--warn)';
const P_VERDICTS = [
  { color: P.ok,   bg: 'rgba(16,185,129,0.08)', label: '✅ PASS',     note: 'Cheat-check passes and tlapm accepts' },
  { color: P.err,  bg: 'rgba(239,68,68,0.06)',  label: '❌ FAIL',     note: 'Cheat-check passes and tlapm does not accept' },
  { color: P_WARN, bg: 'rgba(245,158,11,0.08)', label: '🚨 CHEATING', note: 'Cheat-check finds a rule violation and tlapm is skipped' },
];

function PMobilePipeline() {
  return (
    <ol className="phase-mobile-flow" aria-label="Proof grading pipeline">
      <li className="phase-mobile-stage">
        <span className="phase-mobile-step">01 · Submission</span>
        <strong>Model candidate proof</strong>
      </li>
      <li className="phase-mobile-arrow" aria-hidden="true">↓</li>
      <li className="phase-mobile-stage">
        <span className="phase-mobile-step">02 · Cheat-check</span>
        <strong>Cheat-checker</strong>
      </li>
      <li className="phase-mobile-arrow" aria-hidden="true">↓</li>
      <li className="phase-mobile-stage">
        <span className="phase-mobile-step">03 · Verification</span>
        <strong>tlapm</strong>
      </li>
      <li className="phase-mobile-arrow" aria-hidden="true">↓</li>
      <li className="phase-mobile-stage phase-mobile-verdicts">
        <span className="phase-mobile-step">04 · Verdict</span>
        {P_VERDICTS.map((verdict) => (
          <div className="phase-mobile-verdict" key={verdict.label} style={{ background: verdict.bg, borderColor: verdict.color }}>
            <strong style={{ color: verdict.color }}>{verdict.label}</strong>
            <small>{verdict.note}</small>
          </div>
        ))}
      </li>
    </ol>
  );
}

function APipeline({ layout = 'desktop' }) {
  if (layout === 'mobile') return <PMobilePipeline />;
  return (
    <div className="banner">
      <div style={{
        padding: '18px 20px',
        display: 'grid',
        gridTemplateColumns: '212px 72px 234px 92px 100px 58px 1fr',
        gridTemplateRows: '1fr',
        alignItems: 'center',
        height: '100%',
        boxSizing: 'border-box',
      }}>
        <div style={{ gridColumn: '1' }}>
          <PCode title="Euclid/GCD_GCD3.tla">
{`THEOREM GCD3 ==
  ASSUME NEW m \\in Nat,
         NEW n \\in Nat
  PROVE  GCD(m, n) = GCD(n, m)
PROOF OBVIOUS`}
          </PCode>
        </div>

        <div style={{ gridColumn: '2', display: 'flex', justifyContent: 'center' }}>
          <PArrow label="AI / agent" w={72} dashed />
        </div>

        <div style={{ gridColumn: '3' }}>
          <PCode title="candidate proof">
{`<1>1. m | GCD(m, n)  BY DEF GCD
<1>2. n | GCD(m, n)  BY DEF GCD
<1> QED
  BY <1>1, <1>2`}
          </PCode>
        </div>

        <div style={{ gridColumn: '4', display: 'flex', justifyContent: 'center' }}>
          <PArrow label="cheat-checker" sub="legitimate?" w={92} />
        </div>

        <div style={{ gridColumn: '5', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: '100%', boxSizing: 'border-box',
            border: `1px solid ${P.line}`, borderRadius: 6, background: '#fbfcfe',
            padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 3,
          }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: P.ink3, textTransform: 'uppercase', letterSpacing: 0.5 }}>cheat-check</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: PFS.body, color: P.ok, fontWeight: 700 }}>✓ clean</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: P.ink3, lineHeight: 1.3 }}>no tamper — tlapm runs next</span>
          </div>
        </div>

        <div style={{ gridColumn: '6', display: 'flex', justifyContent: 'center' }}>
          <PArrow label="tlapm" sub="correct?" w={58} />
        </div>

        <div style={{ gridColumn: '7', display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 12 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: PFS.caption, color: P.ink3, letterSpacing: 0.8, fontWeight: 600, textTransform: 'uppercase' }}>
            Verdict (in Docker sandbox)
          </div>
          {P_VERDICTS.map(v => (
            <div key={v.label} style={{
              display: 'flex', flexDirection: 'column', gap: 2, padding: '5px 11px',
              background: v.bg,
              border: `1.5px solid ${v.color}`, borderRadius: 6,
            }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: PFS.body, color: v.color, fontWeight: 700 }}>{v.label}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: P.ink3 }}>{v.note}</span>
            </div>
          ))}
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: P.ink3, marginTop: 2 }}>
            pass rate = PASS / scored tasks
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { APipeline });
