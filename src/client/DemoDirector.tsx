import { useCallback, useEffect, useState } from 'react';
import { SHOWCASE_SCENES, type ShowcaseSceneId } from './showcase';

type DemoDirectorProps = {
  ready: boolean;
  onScene: (scene: ShowcaseSceneId) => void;
  onStartAudio: () => void;
};

export function DemoDirector({ ready, onScene, onStartAudio }: DemoDirectorProps) {
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [soundPrimed, setSoundPrimed] = useState(false);
  // Recording starts clean: playback is still controllable by keyboard, but no
  // director strip blocks the Three.js city. Press D to reveal it while editing.
  const [clean, setClean] = useState(true);
  const [index, setIndex] = useState(0);
  const scene = SHOWCASE_SCENES[index]!;

  const start = useCallback(() => {
    if (!ready) return;
    onStartAudio();
    setIndex(0);
    setStarted(true);
    setPlaying(true);
  }, [onStartAudio, ready]);

  // This is a recording reel, not an extra game mode: begin the moment the
  // Three.js city is ready instead of putting a second CTA in front of it.
  useEffect(() => {
    if (!ready || started) return;
    start();
  }, [ready, start, started]);

  const move = useCallback((delta: number) => {
    setIndex((current) => Math.min(SHOWCASE_SCENES.length - 1, Math.max(0, current + delta)));
  }, []);

  useEffect(() => {
    if (!started) return;
    onScene(scene.id);
  }, [onScene, scene.id, started]);

  useEffect(() => {
    if (!started || !playing || index >= SHOWCASE_SCENES.length - 1) return undefined;
    const timer = window.setTimeout(() => setIndex((current) => current + 1), scene.durationMs);
    return () => window.clearTimeout(timer);
  }, [index, playing, scene.durationMs, started]);

  // Browsers and Reddit webviews block audible autoplay. The reel still starts
  // visually, then its first normal tap enables the already-selected raid track.
  useEffect(() => {
    if (!started || soundPrimed) return undefined;
    const enableSound = () => {
      onStartAudio();
      setSoundPrimed(true);
    };
    window.addEventListener('pointerdown', enableSound, { once: true, passive: true });
    return () => window.removeEventListener('pointerdown', enableSound);
  }, [onStartAudio, soundPrimed, started]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!started) return;
      if (event.key === 'ArrowRight') move(1);
      else if (event.key === 'ArrowLeft') move(-1);
      else if (event.code === 'Space') {
        event.preventDefault();
        setPlaying((value) => !value);
      } else if (event.key.toLowerCase() === 'd') setClean((value) => !value);
      else if (event.key === 'Home') {
        setIndex(0);
        setPlaying(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, started]);

  if (!started) return null;

  return (
    <div className={clean ? 'demo-director clean' : 'demo-director'} data-showcase-scene={scene.id}>
      <div className="demo-story" aria-live="polite">
        <div className="demo-story-k">{scene.eyebrow}</div>
        <div className="demo-story-title">{scene.title}</div>
        <div className="demo-story-line">{scene.line}</div>
        <ul className="demo-story-details">
          {scene.details.map((detail) => <li key={detail}>{detail}</li>)}
        </ul>
        <div className="demo-progress" aria-hidden="true">
          <i key={`${scene.id}-${playing ? 'play' : 'pause'}`} style={{ animationDuration: `${scene.durationMs}ms`, animationPlayState: playing ? 'running' : 'paused' }} />
        </div>
      </div>

      {!soundPrimed && <div className="demo-sound-cue">TAP ANYWHERE FOR SOUND</div>}

      {!clean && (
        <div className="demo-controls" aria-label="Demo recording controls">
          <button type="button" onClick={() => move(-1)} disabled={index === 0} aria-label="Previous scene">‹</button>
          <button type="button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? 'Pause demo' : 'Play demo'}>
            {playing ? 'Ⅱ' : '▶'}
          </button>
          <span>{String(index + 1).padStart(2, '0')} / {String(SHOWCASE_SCENES.length).padStart(2, '0')}</span>
          <button type="button" className="demo-next" onClick={() => move(1)} disabled={index === SHOWCASE_SCENES.length - 1} aria-label="Next scene">›</button>
          <button type="button" onClick={() => { setIndex(0); setPlaying(true); }} aria-label="Restart demo">↻</button>
          <button type="button" onClick={() => setClean(true)} aria-label="Hide director controls">●</button>
        </div>
      )}
    </div>
  );
}
