/* global React */
const P = {
  ink: 'var(--ink)', ink2: 'var(--ink-2)', ink3: 'var(--ink-3)', ink4: 'var(--ink-4)',
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
function PArrow({ label, w = 70, dashed = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: w, flexShrink: 0 }}>
      {label && <div style={{ fontSize: PFS.caption, color: P.ink3, fontFamily: 'var(--mono)', marginBottom: 4 }}>{label}</div>}
      <svg width={w} height={20} viewBox={`0 0 ${w} 20`}>
        <line x1={2} y1={10} x2={w - 10} y2={10} stroke={P.ink3} strokeWidth={1.5} strokeDasharray={dashed ? "4 3" : undefined} />
        <path d={`M${w - 10} 5 L${w - 3} 10 L${w - 10} 15`} fill="none" stroke={P.ink3} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function APipeline() {
  const verdicts = [
    { ok: true,  label: '✓ accepted' },
    { ok: false, label: '✗ rejected' },
  ];
  return (
    <div className="banner">
      <div style={{
        padding: '18px 20px',
        display: 'grid',
        gridTemplateColumns: '300px 96px 280px 96px 1fr',
        gridTemplateRows: '1fr',
        alignItems: 'center',
        height: '100%',
        boxSizing: 'border-box',
      }}>
        <div style={{ gridColumn: '1' }}>
          <PCode title="GCD.tla — target theorem">
{`THEOREM GCD3 ==
  ASSUME NEW m \\in Nat,
         NEW n \\in Nat
  PROVE  GCD(m, n) = GCD(n, m)
PROOF OBVIOUS`}
          </PCode>
        </div>

        <div style={{ gridColumn: '2', display: 'flex', justifyContent: 'center' }}>
          <PArrow label="AI / agent" w={84} dashed />
        </div>

        <div style={{ gridColumn: '3' }}>
          <PCode title="candidate proof">
{`<1>1. GCD(m,n) | m  BY DEF GCD
<1>2. GCD(m,n) | n  BY DEF GCD
<1>3. QED
  BY <1>1, <1>2,
     GCDCommutative`}
          </PCode>
        </div>

        <div style={{ gridColumn: '4', display: 'flex', justifyContent: 'center' }}>
          <PArrow label="tlapm" w={84} />
        </div>

        <div style={{ gridColumn: '5', display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 12 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: PFS.caption, color: P.ink3, letterSpacing: 0.8, fontWeight: 600, textTransform: 'uppercase' }}>
            Verdict (in Docker sandbox)
          </div>
          {verdicts.map(v => (
            <div key={v.label} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
              background: v.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.06)',
              border: `1.5px solid ${v.ok ? P.ok : P.err}`, borderRadius: 6,
              fontFamily: 'var(--mono)', fontSize: PFS.body,
              color: v.ok ? P.ok : P.err, fontWeight: 700,
            }}>{v.label}</div>
          ))}
          <div style={{ height: 1, background: 'var(--accent-soft)' }} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: PFS.caption, color: P.ink3 }}>pass rate</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 14, color: P.ink2 }}>accepted / total</span>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { APipeline });
