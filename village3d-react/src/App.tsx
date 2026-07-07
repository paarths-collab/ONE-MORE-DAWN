import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createVillageScene,
  MAX_VILLAGERS,
  type BuildingMeta,
  type CompanionKind,
  type TimeOfDay,
  type VillageHandle,
} from './scene';

// ONE MORE DAWN — 3D village, React edition v2. The scene (scene.ts) exposes a
// live API; this file is the entire visible UI: canvas mount + HUD + the SCENE
// control panel (time of day, villagers, companions) as real React state.

const TIMES: { id: TimeOfDay; icon: string; label: string; tagline: string }[] = [
  { id: 'night', icon: '🌙', label: 'NIGHT', tagline: 'the city sleeps — dawn is coming' },
  { id: 'dawn', icon: '🌅', label: 'DAWN', tagline: 'dawn is coming — hold the line' },
  { id: 'day', icon: '☀️', label: 'DAY', tagline: 'the city works while the light lasts' },
  { id: 'dusk', icon: '🌇', label: 'DUSK', tagline: 'last light — count your stores' },
];

const COMPANIONS: { id: CompanionKind; icon: string; label: string }[] = [
  { id: 'horse', icon: '🐴', label: 'HORSE' },
  { id: 'flamingo', icon: '🦩', label: 'FLAMINGO' },
  { id: 'parrot', icon: '🦜', label: 'PARROT' },
  { id: 'stork', icon: '🕊️', label: 'STORK' },
];

function VillageCanvas({
  onReady,
  onProgress,
  onLoad,
  onSelect,
}: {
  onReady: (h: VillageHandle) => void;
  onProgress: (pct: number) => void;
  onLoad: () => void;
  onSelect: (meta: BuildingMeta | null) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return undefined;
    const handle = createVillageScene(el, { onProgress, onLoad, onSelect });
    onReady(handle);
    return () => handle.dispose();
    // mount once — callbacks are stable (useCallback in App)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div ref={mountRef} className="canvas-mount" />;
}

function TopBar() {
  const RES: [string, string][] = [
    ['🍞', '342'],
    ['⚡', '78'],
    ['🩹', '12'],
    ['👥', '143'],
  ];
  return (
    <div className="hud topbar">
      <div className="title card-bit">
        <h1>THE LAST CITY</h1>
        <div className="sub">3D village · React + three.js · not wired to the game</div>
      </div>
      <div className="res">
        {RES.map(([icon, value]) => (
          <span key={icon} className="pill card-bit">
            {icon} <b>{value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

function DayPill({ time, auto }: { time: TimeOfDay; auto: boolean }) {
  const def = TIMES.find((t) => t.id === time)!;
  return (
    <div className={time === 'dawn' ? 'hud day card-bit glow' : 'hud day card-bit'}>
      <div className="dn">
        {def.icon} {def.label}
        {auto && <span className="auto-tag">AUTO</span>}
      </div>
      <div className="dt">{def.tagline}</div>
    </div>
  );
}

function ScenePanel({
  open,
  setOpen,
  time,
  setTime,
  auto,
  setAuto,
  villagers,
  bumpVillagers,
  companions,
  toggleCompanion,
}: {
  open: boolean;
  setOpen: (b: boolean) => void;
  time: TimeOfDay;
  setTime: (t: TimeOfDay) => void;
  auto: boolean;
  setAuto: (b: boolean) => void;
  villagers: number;
  bumpVillagers: (delta: number) => void;
  companions: Record<CompanionKind, boolean>;
  toggleCompanion: (k: CompanionKind) => void;
}) {
  return (
    <>
      <button type="button" className="hud panel-fab card-bit" onClick={() => setOpen(!open)} aria-expanded={open}>
        ⚙ SCENE
      </button>
      <div className={open ? 'hud panel card-bit on' : 'hud panel card-bit'}>
        <div className="p-head">
          <span>SCENE</span>
          <button type="button" className="p-x" onClick={() => setOpen(false)} aria-label="Close panel">
            ✕
          </button>
        </div>

        <div className="p-sec">TIME OF DAY</div>
        <div className="seg">
          {TIMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={t.id === time && !auto ? 'seg-btn on' : 'seg-btn'}
              onClick={() => {
                setAuto(false);
                setTime(t.id);
              }}
              aria-pressed={t.id === time}
              title={t.label}
            >
              <span className="si">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" className={auto ? 'auto-btn on' : 'auto-btn'} onClick={() => setAuto(!auto)} aria-pressed={auto}>
          {auto ? '◉' : '○'} AUTO — let the day turn
        </button>

        <div className="p-sec">VILLAGERS</div>
        <div className="stepper">
          <button type="button" onClick={() => bumpVillagers(-1)} aria-label="Fewer villagers">
            −
          </button>
          <span className="count">
            {villagers} <i>walking</i>
          </span>
          <button type="button" onClick={() => bumpVillagers(1)} aria-label="More villagers">
            +
          </button>
        </div>

        <div className="p-sec">COMPANIONS</div>
        <div className="chips">
          {COMPANIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={companions[c.id] ? 'chip-t on' : 'chip-t'}
              onClick={() => toggleCompanion(c.id)}
              aria-pressed={companions[c.id]}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function BuildingChip({ meta }: { meta: BuildingMeta | null }) {
  const [shown, setShown] = useState<BuildingMeta | null>(meta);
  useEffect(() => {
    if (meta) setShown(meta);
  }, [meta]);
  return (
    <div className={meta ? 'hud chip card-bit on' : 'hud chip card-bit'}>
      <div className="nm">{shown?.name ?? ''}</div>
      <div className="lv">LEVEL {shown?.level ?? 1}</div>
      <div className="bl">{shown?.blurb ?? ''}</div>
      <button type="button" className="up" disabled>
        ⬆ UPGRADE — SOON
      </button>
    </div>
  );
}

function BuildDock() {
  const [toast, setToast] = useState(false);
  const timer = useRef<number | null>(null);
  const pop = useCallback(() => {
    setToast(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(false), 2200);
  }, []);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  return (
    <div className="hud dock">
      <div className="credits">villagers &amp; wildlife: three.js example models (threejs.org)</div>
      <div style={{ position: 'relative' }}>
        <div className={toast ? 'toast on' : 'toast'}>Building placement — coming soon</div>
        <button type="button" className="build" onClick={pop} aria-label="Build">
          🔨
        </button>
      </div>
      <span className="btag">BUILD</span>
    </div>
  );
}

function Loader({ pct, done }: { pct: number; done: boolean }) {
  return (
    <div className={done ? 'loader done' : 'loader'}>
      <div className="sun" />
      <h2>ONE MORE DAWN</h2>
      <div className="bar">
        <i style={{ width: `${pct}%` }} />
      </div>
      <div className="st">waking the village…</div>
    </div>
  );
}

export function App() {
  const [pct, setPct] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<BuildingMeta | null>(null);
  const [time, setTimeState] = useState<TimeOfDay>('dawn');
  const [auto, setAuto] = useState(false);
  const [villagers, setVillagersState] = useState(3);
  const [companions, setCompanions] = useState<Record<CompanionKind, boolean>>({
    horse: true,
    flamingo: true,
    parrot: true,
    stork: true,
  });
  const [panelOpen, setPanelOpen] = useState(true);
  const handleRef = useRef<VillageHandle | null>(null);

  const onReady = useCallback((h: VillageHandle) => {
    handleRef.current = h;
  }, []);
  const onProgress = useCallback((p: number) => setPct(p), []);
  const onLoad = useCallback(() => setLoaded(true), []);
  const onSelect = useCallback((meta: BuildingMeta | null) => setSelected(meta), []);

  const setTime = useCallback((t: TimeOfDay) => {
    setTimeState(t);
    handleRef.current?.setTimeOfDay(t);
  }, []);
  // Functional updates + effect-driven sync: rapid +/- taps land between React
  // renders, so reading `villagers` in a click handler would use stale state.
  const bumpVillagers = useCallback((delta: number) => {
    setVillagersState((v) => Math.max(0, Math.min(MAX_VILLAGERS, v + delta)));
  }, []);
  useEffect(() => {
    handleRef.current?.setVillagers(villagers);
  }, [villagers, loaded]);
  const toggleCompanion = useCallback((k: CompanionKind) => {
    setCompanions((prev) => ({ ...prev, [k]: !prev[k] }));
  }, []);
  useEffect(() => {
    const h = handleRef.current;
    if (!h) return;
    (Object.keys(companions) as CompanionKind[]).forEach((k) => h.setCompanion(k, companions[k]));
  }, [companions, loaded]);

  // AUTO: the day slowly turns — night → dawn → day → dusk, ~12s per phase.
  useEffect(() => {
    if (!auto) return undefined;
    const order: TimeOfDay[] = ['night', 'dawn', 'day', 'dusk'];
    const id = window.setInterval(() => {
      setTimeState((cur) => {
        const next = order[(order.indexOf(cur) + 1) % order.length]!;
        handleRef.current?.setTimeOfDay(next);
        return next;
      });
    }, 12000);
    return () => window.clearInterval(id);
  }, [auto]);

  return (
    <>
      <VillageCanvas onReady={onReady} onProgress={onProgress} onLoad={onLoad} onSelect={onSelect} />
      <TopBar />
      <DayPill time={time} auto={auto} />
      <ScenePanel
        open={panelOpen}
        setOpen={setPanelOpen}
        time={time}
        setTime={setTime}
        auto={auto}
        setAuto={setAuto}
        villagers={villagers}
        bumpVillagers={bumpVillagers}
        companions={companions}
        toggleCompanion={toggleCompanion}
      />
      <BuildingChip meta={selected} />
      <BuildDock />
      <div className="hud hint card-bit">drag to pan · scroll / pinch to zoom · click a building</div>
      <Loader pct={pct} done={loaded} />
    </>
  );
}
