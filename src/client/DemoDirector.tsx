import { useCallback, useEffect, useState } from 'react';
import {
  SHOWCASE_SCENES,
  showcaseAutoplayFromSearch,
  showcaseCleanCaptureFromSearch,
  showcaseSceneFromSearch,
  type ShowcaseSceneId,
} from './showcase';

type DemoDirectorProps = {
  ready: boolean;
  onScene: (scene: ShowcaseSceneId) => void;
  onStartAudio: () => void;
};

const SPEEDS = [0.5, 1, 2] as const;

export function DemoDirector({ ready, onScene, onStartAudio }: DemoDirectorProps) {
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [soundPrimed, setSoundPrimed] = useState(false);
  // Capture is clean and paused by default. The editing strip appears only on D.
  const [controlsHidden, setControlsHidden] = useState(true);
  const [directorHidden, setDirectorHidden] = useState(true);
  const [hideCursor, setHideCursor] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [index, setIndex] = useState(() =>
    SHOWCASE_SCENES.findIndex((entry) => entry.id === showcaseSceneFromSearch(window.location.search)),
  );
  const [storyVisible, setStoryVisible] = useState(true);
  const scene = SHOWCASE_SCENES[index]!;
  const autoplay = showcaseAutoplayFromSearch(window.location.search);
  const cleanCapture = showcaseCleanCaptureFromSearch(window.location.search);
  const titleCard = scene.id === 'opening' || scene.id === 'end';

  const start = useCallback(() => {
    if (!ready) return;
    setStarted(true);
    setPlaying(autoplay);
  }, [autoplay, ready]);

  useEffect(() => {
    if (!ready || started) return;
    start();
  }, [ready, start, started]);

  const move = useCallback((delta: number) => {
    setIndex((current) => Math.min(SHOWCASE_SCENES.length - 1, Math.max(0, current + delta)));
  }, []);

  const replay = useCallback(() => {
    setIndex(0);
    setPlaying(true);
  }, []);

  useEffect(() => {
    if (!started) return;
    onScene(scene.id);
    setStoryVisible(!scene.storyDelayMs);
    if (!scene.storyDelayMs || !playing) return undefined;
    const reveal = window.setTimeout(() => setStoryVisible(true), scene.storyDelayMs / speed);
    return () => window.clearTimeout(reveal);
  }, [onScene, playing, scene.id, scene.storyDelayMs, speed, started]);

  useEffect(() => {
    if (!started || !playing || index >= SHOWCASE_SCENES.length - 1) return undefined;
    const timer = window.setTimeout(() => setIndex((current) => current + 1), scene.durationMs / speed);
    return () => window.clearTimeout(timer);
  }, [index, playing, scene.durationMs, speed, started]);

  useEffect(() => {
    if (!started || soundPrimed || !playing) return undefined;
    const enableSound = () => {
      onStartAudio();
      setSoundPrimed(true);
    };
    window.addEventListener('pointerdown', enableSound, { once: true, passive: true });
    return () => window.removeEventListener('pointerdown', enableSound);
  }, [onStartAudio, playing, soundPrimed, started]);

  useEffect(() => {
    document.body.classList.toggle('demo-hide-cursor', hideCursor);
    return () => document.body.classList.remove('demo-hide-cursor');
  }, [hideCursor]);

  useEffect(() => {
    document.body.classList.toggle('demo-title-frame', titleCard);
    return () => document.body.classList.remove('demo-title-frame');
  }, [titleCard]);

  useEffect(() => {
    document.body.classList.toggle('demo-clean-capture', cleanCapture);
    return () => document.body.classList.remove('demo-clean-capture');
  }, [cleanCapture]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!started) return;
      if (event.key === 'ArrowRight') move(1);
      else if (event.key === 'ArrowLeft') move(-1);
      else if (event.code === 'Space') {
        event.preventDefault();
        setPlaying((value) => !value);
      } else if (event.key.toLowerCase() === 'd') setControlsHidden((value) => !value);
      else if (event.key.toLowerCase() === 'h') setDirectorHidden((value) => !value);
      else if (event.key.toLowerCase() === 'r') replay();
      else if (event.key.toLowerCase() === 'c') setHideCursor((value) => !value);
      else if (event.key === 'Home') replay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, replay, started]);

  if (!started) return null;

  return (
    <div className={directorHidden && !titleCard ? 'demo-director recording-hidden' : 'demo-director'} data-showcase-scene={scene.id}>
      {titleCard ? (
        <div className={`demo-title-card ${scene.id === 'end' ? 'closing' : ''}`} aria-live="polite">
          <div className="demo-title">ONE MORE DAWN</div>
          {scene.id === 'opening' ? (
            <div className="demo-enter">ENTER THE CITY</div>
          ) : (
            <>
              <div className="demo-closing-line">A COMMUNITY BUILDS THE CITY IT NEEDS.</div>
              <div className="demo-coming">CAN YOUR CITY SURVIVE?</div>
            </>
          )}
        </div>
      ) : !directorHidden && storyVisible && (
        <div className="demo-story" aria-live="polite">
          {scene.eyebrow && <div className="demo-story-k">{scene.eyebrow}</div>}
          {scene.title && <div className="demo-story-title">{scene.title}</div>}
          {scene.line && <div className="demo-story-line">{scene.line}</div>}
          <div className="demo-progress" aria-hidden="true">
            <i key={`${scene.id}-${playing ? 'play' : 'pause'}-${speed}`} style={{ animationDuration: `${scene.durationMs / speed}ms`, animationPlayState: playing ? 'running' : 'paused' }} />
          </div>
        </div>
      )}

      {!directorHidden && !soundPrimed && !titleCard && playing && <div className="demo-sound-cue">TAP ANYWHERE FOR SOUND</div>}

      {!controlsHidden && (
        <div className="demo-controls" aria-label="Demo recording controls">
          <button type="button" onClick={() => move(-1)} disabled={index === 0} aria-label="Previous scene">‹</button>
          <button type="button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? 'Pause demo' : 'Play demo'}>{playing ? 'Ⅱ' : '▶'}</button>
          <span>{String(index + 1).padStart(2, '0')} / {String(SHOWCASE_SCENES.length).padStart(2, '0')}</span>
          <button type="button" onClick={() => move(1)} disabled={index === SHOWCASE_SCENES.length - 1} aria-label="Next scene">›</button>
          <button type="button" onClick={replay} aria-label="Replay from the beginning">↻</button>
          <select value={scene.id} onChange={(event) => {
            const next = SHOWCASE_SCENES.findIndex((entry) => entry.id === event.currentTarget.value);
            if (next >= 0) setIndex(next);
          }} aria-label="Jump to recording scene">
            {SHOWCASE_SCENES.map((entry) => <option key={entry.id} value={entry.id}>{entry.id}</option>)}
          </select>
          <div className="demo-speed" aria-label="Playback speed">
            {SPEEDS.map((value) => <button key={value} type="button" className={speed === value ? 'on' : ''} onClick={() => setSpeed(value)}>{value}×</button>)}
          </div>
          <button type="button" className={hideCursor ? 'on' : ''} onClick={() => setHideCursor((value) => !value)} aria-label="Hide cursor">⌁</button>
          <button type="button" onClick={() => { setDirectorHidden(true); setControlsHidden(true); }} aria-label="Hide all recording overlays">H</button>
        </div>
      )}
    </div>
  );
}
