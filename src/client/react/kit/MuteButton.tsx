import { useEffect, useState } from 'react';
import { sfx } from './sound';

/** Topbar 🔊/🔇 toggle, styled as a pixel pill. Persists via the sound engine. */
export function MuteButton() {
  const [muted, setMuted] = useState(sfx.isMuted());
  useEffect(() => sfx.subscribe(setMuted), []);
  return (
    <button
      type="button"
      className="pxl-pill"
      style={{ cursor: 'pointer', borderColor: 'var(--line2)', background: 'var(--card2)', color: 'var(--ink)' }}
      onClick={() => sfx.toggle()}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      aria-pressed={muted}
      title={muted ? 'Sound off' : 'Sound on'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
