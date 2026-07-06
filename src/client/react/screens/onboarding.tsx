import { useLayoutEffect, useState } from 'react';
import type { CSSProperties } from 'react';

// ONBOARDING — the 10-second hook splash (first thing a brand-new player sees)
// and the 3-tap guided tour (spotlight coachmarks) that runs once they land on
// the dashboard. Both are pure UI; no server state.

// ---------- the hook splash ----------

const STEPS: readonly { n: string; t: string; d: string }[] = [
  { n: '1', t: 'Pledge to save The Marked', d: 'One tap. A named survivor is in danger tonight.' },
  { n: '2', t: 'Vote on the crisis', d: 'Every choice has a cost. The city decides together.' },
  { n: '3', t: 'Survive one more dawn', d: 'Come back at sunrise to see what your city did.' },
];

export function HookSplash({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="pxl-full">
      <div className="inner pxl-hook">
        <div className="pxl-boot-sun" aria-hidden="true" />
        <h2>ONE MORE DAWN</h2>
        <p className="pxl-hook-pitch">
          Every subreddit has a city. Yours is dying.
          <br />
          <b>Keep it alive until sunrise.</b>
        </p>
        <div className="pxl-hook-steps">
          {STEPS.map((s) => (
            <div key={s.n} className="pxl-hook-step">
              <span className="hn">{s.n}</span>
              <span className="ht">
                <span className="tt">{s.t}</span>
                <span className="td">{s.d}</span>
              </span>
            </div>
          ))}
        </div>
        <button type="button" className="pxl-btn" onClick={onBegin}>
          ☀️ Begin — build your survivor
        </button>
        <div className="pxl-hook-foot">Async multiplayer · every citizen is a real redditor</div>
      </div>
    </div>
  );
}

// ---------- the 3-tap guided tour (spotlight coachmarks) ----------

export type TourStep = { sel: string; title: string; body: string };

/**
 * Spotlight tour: dims the screen, cuts a hole around each target element (found
 * by selector), and shows a caption near it. Advancing is one tap anywhere.
 * Robust across the responsive layouts — it measures live rects and re-measures
 * on resize, and centers the caption when a target isn't on screen.
 */
export function Coachmarks({ steps, onDone }: { steps: readonly TourStep[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[i];
  const last = i >= steps.length - 1;

  useLayoutEffect(() => {
    if (!step) return;
    const el = document.querySelector(step.sel);
    if (el) el.scrollIntoView({ block: 'center', inline: 'center' });
    const measure = () => setRect(el ? el.getBoundingClientRect() : null);
    measure();
    window.addEventListener('resize', measure);
    const id = window.setTimeout(measure, 260); // after scroll settles
    return () => {
      window.removeEventListener('resize', measure);
      window.clearTimeout(id);
    };
  }, [step]);

  if (!step) return null;
  const next = () => (last ? onDone() : setI((v) => v + 1));

  const pad = 8;
  const hole = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  // Caption below the target when there's room, else above; centered if no rect.
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const below = !rect || rect.bottom + 150 < vh;
  const tipStyle: CSSProperties = rect
    ? below
      ? { top: rect.bottom + pad + 10, left: 12, right: 12 }
      : { bottom: vh - rect.top + pad + 10, left: 12, right: 12 }
    : { top: '50%', left: 12, right: 12, transform: 'translateY(-50%)' };

  return (
    <div className="pxl-tour" onClick={next} role="dialog" aria-modal="true">
      {hole && (
        <div
          className="pxl-tour-hole"
          style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
        />
      )}
      <div className="pxl-tour-tip" style={tipStyle} onClick={(e) => e.stopPropagation()}>
        <div className="pxl-tour-step">
          STEP {i + 1} / {steps.length}
        </div>
        <div className="pxl-tour-title">{step.title}</div>
        <div className="pxl-tour-body">{step.body}</div>
        <div className="pxl-tour-actions">
          <button type="button" className="pxl-tour-skip" onClick={onDone}>
            Skip
          </button>
          <button type="button" className="pxl-tour-next" onClick={next}>
            {last ? "Got it — let's go" : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The three taps every new citizen learns. Targets carry data-tour markers. */
export const TOUR_STEPS: readonly TourStep[] = [
  {
    sel: '[data-tour="pledge"]',
    title: 'Save tonight’s Marked',
    body: 'One tap — no energy needed. A named survivor is in danger. Pledge to pull them through before dawn.',
  },
  {
    sel: '[data-tour="crisis"]',
    title: 'Vote on the crisis',
    body: 'The whole city votes on one hard choice a day. Every option has a gain and a cost — choose together.',
  },
  {
    sel: '[data-tour="dawn"]',
    title: 'Come back at dawn',
    body: 'At sunrise the city resolves and your Dawn Report shows exactly what your choices did. Survive one more dawn.',
  },
];
