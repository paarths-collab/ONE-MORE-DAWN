import { type CSSProperties, useState } from 'react';

// The frontend-only demo's front door: a one-time notice that this is a visual
// way for judges to experience One More Dawn (not the live Reddit game), plus a
// small persistent ribbon so it stays unmistakable. Rendered only in the demo
// build (see game.tsx); fully self-contained styling so it touches nothing else.

const overlay: CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(6, 5, 5, 0.82)', backdropFilter: 'blur(3px)', padding: '20px',
};
const sheet: CSSProperties = {
  maxWidth: '460px', width: '100%', background: '#14100b', border: '1px solid #6e5b1e',
  borderRadius: '14px', padding: '24px 24px 22px', boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
  color: '#e8e2d6', fontFamily: "'JetBrains Mono', ui-monospace, monospace",
};
const kicker: CSSProperties = {
  fontFamily: "'Silkscreen', ui-monospace, monospace", fontSize: '9px', letterSpacing: '2px',
  color: '#e8c34a', marginBottom: '12px',
};
const title: CSSProperties = {
  fontFamily: "'Silkscreen', ui-monospace, monospace", fontSize: '20px', letterSpacing: '2px',
  color: '#e8c34a', margin: '0 0 14px', textShadow: '0 3px 0 #493913',
};
const para: CSSProperties = { fontSize: '12.5px', lineHeight: 1.6, margin: '0 0 12px' };
const paraMuted: CSSProperties = { ...para, color: '#8f8578', fontSize: '11.5px' };
const btn: CSSProperties = {
  marginTop: '6px', width: '100%', minHeight: '44px', cursor: 'pointer',
  fontFamily: "'Silkscreen', ui-monospace, monospace", fontSize: '11px', letterSpacing: '1.5px', color: '#171109',
  background: 'linear-gradient(180deg, #f5d76e, #e8c34a 55%, #b98d2a)', border: '1px solid #7a6120',
  borderRadius: '10px', padding: '12px 14px',
};
const ribbon: CSSProperties = {
  position: 'fixed', left: '10px', bottom: '10px', zIndex: 40, pointerEvents: 'none',
  fontFamily: "'Silkscreen', ui-monospace, monospace", fontSize: '8px', letterSpacing: '1.5px', color: '#e8c34a',
  background: 'rgba(20, 16, 11, 0.72)', border: '1px solid #6e5b1e', borderRadius: '8px',
  padding: '5px 9px', opacity: 0.85,
};

export function DemoBanner() {
  const [open, setOpen] = useState(true);
  return (
    <>
      {open && (
        <div style={overlay} role="dialog" aria-modal="true" aria-labelledby="demo-title">
          <div style={sheet}>
            <div style={kicker}>◆ VISUAL DEMO · FRONTEND ONLY</div>
            <h2 id="demo-title" style={title}>
              One More Dawn
            </h2>
            <p style={para}>
              This is a <b>frontend-only</b> way for judges to <b>experience the full game</b> — the daily
              mission &amp; role duty, badges, crisis votes, The Marked, city actions, the cosmetic shop &amp;
              land expansion, the daily puzzle, the world map, and City Chatter.
            </p>
            <p style={paraMuted}>
              The real game runs live on Reddit via Devvit — one shared, persistent city per subreddit that a
              whole community keeps alive together. Here everything is simulated in your browser: nothing is
              saved, and a refresh starts the day over.
            </p>
            <button type="button" style={btn} onClick={() => setOpen(false)}>
              ENTER THE CITY →
            </button>
          </div>
        </div>
      )}
      <div style={ribbon} aria-hidden="true">
        ◆ FRONTEND DEMO
      </div>
    </>
  );
}
