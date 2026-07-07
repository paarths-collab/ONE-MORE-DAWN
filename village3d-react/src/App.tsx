import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createVillageScene,
  MAX_VILLAGERS,
  type BuildingMeta,
  type CompanionKind,
  type PoiInfo,
  type TimeOfDay,
  type VillageHandle,
  type VillageHooks,
} from './scene';

// ONE MORE DAWN — 3D town, React edition v4: the self-running mini-game.
// Left panel: SCENE (time of day, villagers, companions). Right panel: CITY
// dashboard (live vitals + district directory) and LIVE (Marked, comments,
// crisis, council, raid watch, events). The city now plays itself: vitals
// drift, survivors trickle in, days count up, raids arrive and resolve
// against your defense, and you can talk, build huts, and upgrade districts.

const TIMES: { id: TimeOfDay; icon: string; label: string; tagline: string }[] = [
  { id: 'night', icon: '🌙', label: 'NIGHT', tagline: 'the city sleeps — dawn is coming' },
  { id: 'dawn', icon: '🌅', label: 'DAWN', tagline: 'dawn is coming — hold the line' },
  { id: 'day', icon: '☀️', label: 'DAY', tagline: 'the city works while the light lasts' },
  { id: 'dusk', icon: '🌇', label: 'DUSK', tagline: 'last light — count your stores' },
];
const TIME_ORDER: TimeOfDay[] = ['night', 'dawn', 'day', 'dusk'];

const COMPANIONS: { id: CompanionKind; icon: string; label: string }[] = [
  { id: 'horse', icon: '🐴', label: 'HORSE' },
  { id: 'flamingo', icon: '🦩', label: 'FLAMINGO' },
  { id: 'parrot', icon: '🦜', label: 'PARROT' },
  { id: 'stork', icon: '🕊️', label: 'STORK' },
];

// ---------- LIVE tab demo data (copied from the game's mock fixtures in
// src/client/game/api.ts + src/client/react/defs.ts — this prototype is not
// wired to the server, so the numbers drift on timers instead).

type CrisisOptId = 'a' | 'b' | 'c';
type PlanId = 'prepare_raid' | 'stockpile_food' | 'repair_power';
type LiveEvent = { icon: string; text: string; key: number };
type TalkMsg = { who: string; text: string; you?: boolean; key: number };
type RaidPhase = 'idle' | 'incoming' | 'held' | 'breach';

const MARKED_GOAL = 40;

const PLEDGES: { id: string; icon: string; label: string }[] = [
  { id: 'stand_vigil', icon: '🕯️', label: 'Stand Vigil' },
  { id: 'share_rations', icon: '🍞', label: 'Share Rations' },
  { id: 'run_messages', icon: '🕊️', label: 'Run Messages' },
  { id: 'back_council', icon: '🏛️', label: 'Back the Council' },
];

const CRISIS_IDS: CrisisOptId[] = ['a', 'b', 'c'];
const CRISIS_OPTS: { id: CrisisOptId; nm: string; fx: string }[] = [
  { id: 'a', nm: 'Let them in', fx: '+30 👥 · −20 🍞 · +4 🙂' },
  { id: 'b', nm: 'Turn them away', fx: '−10 🙂 · +3 🛡️' },
  { id: 'c', nm: 'Inspect first', fx: '+15 👥 · −8 🍞 · +3 ☠️' },
];

const PLAN_IDS: PlanId[] = ['prepare_raid', 'stockpile_food', 'repair_power'];
const PLANS: { id: PlanId; nm: string }[] = [
  { id: 'prepare_raid', nm: '🛡️ Prepare for Raid' },
  { id: 'stockpile_food', nm: '🍞 Stockpile Food' },
  { id: 'repair_power', nm: '⚡ Repair Power' },
];

const DRAMA: { icon: string; text: string }[] = [
  { icon: '🕯️', text: 'ashen_fox stood vigil for Mira — the medics take heart.' },
  { icon: '⚔️', text: 'Raiders probed the North Wall at dusk. The watch held.' },
  { icon: '🎒', text: 'quiet_marrow crawled back from the deep ruins with 7 food.' },
  { icon: '🗳️', text: '25 citizens have voted on the Convoy at the Gate.' },
  { icon: '📜', text: 'The Council leans toward Prepare for Raid — 9 backers.' },
  { icon: '🩹', text: 'saltcedar treated the sick through the night shift.' },
  { icon: '🏚️', text: 'A rival city went dark last night. Theirs, not ours.' },
  { icon: '🌅', text: 'Dawn broke over the city — day 5, still standing.' },
];

// Scripted replies to SAY HI — rotates each use.
const HI_REPLIES: { who: string; text: string }[] = [
  { who: 'u/ashen_fox', text: 'hii 👋 welcome to the wall' },
  { who: 'u/quiet_marrow', text: 'gm 🌅' },
  { who: 'u/saltcedar', text: 'stay warm out there' },
];

// City vitals — same keys/start values as before, but live state now: ambient
// drift, raids, builds and upgrades all move these numbers.
type VitKey = 'FOOD' | 'POWER' | 'MEDICINE' | 'MORALE' | 'THREAT' | 'DEFENSE';
type Vitals = Record<VitKey, number>;
const VITAL_DEFS: { k: VitKey; icon: string; max: number; danger?: boolean }[] = [
  { k: 'FOOD', icon: '🍞', max: 500 },
  { k: 'POWER', icon: '⚡', max: 100 },
  { k: 'MEDICINE', icon: '🩹', max: 120 },
  { k: 'MORALE', icon: '🙂', max: 100 },
  { k: 'THREAT', icon: '☠️', max: 100, danger: true },
  { k: 'DEFENSE', icon: '🛡️', max: 100 },
];
const START_VITALS: Vitals = { FOOD: 342, POWER: 78, MEDICINE: 12, MORALE: 44, THREAT: 68, DEFENSE: 35 };
const VITAL_MAX: Record<VitKey, number> = { FOOD: 500, POWER: 100, MEDICINE: 120, MORALE: 100, THREAT: 100, DEFENSE: 100 };
const clampVit = (k: VitKey, n: number): number => Math.max(0, Math.min(VITAL_MAX[k], n));

const UPGRADE_COST = 10; // food per district upgrade

const vitColor = (pct: number, danger = false): string =>
  danger ? (pct >= 70 ? '#c85040' : pct >= 40 ? '#e8c34a' : '#57c06a') : pct < 25 ? '#c85040' : pct < 50 ? '#e8c34a' : '#57c06a';

function VillageCanvas({
  onReady,
  onProgress,
  onLoad,
  onSelect,
  onPois,
  onChat,
  onBuilt,
}: {
  onReady: (h: VillageHandle) => void;
  onProgress: (pct: number) => void;
  onLoad: () => void;
  onSelect: (meta: BuildingMeta | null) => void;
  onPois: (pois: PoiInfo[]) => void;
  onChat: (who: string, text: string) => void;
  onBuilt: (x: number, z: number) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return undefined;
    // onChat / onBuilt are optional scene hooks (added by another agent) — the
    // assertion keeps this compiling against either version of scene.ts.
    const handle = createVillageScene(el, { onProgress, onLoad, onSelect, onPois, onChat, onBuilt } as VillageHooks);
    onReady(handle);
    return () => handle.dispose();
    // mount once — callbacks are stable (useCallback in App)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div ref={mountRef} className="canvas-mount" />;
}

function TopBar({ food, power, medicine, population }: { food: number; power: number; medicine: number; population: number }) {
  const RES: [string, number][] = [
    ['🍞', food],
    ['⚡', power],
    ['🩹', medicine],
    ['👥', population],
  ];
  return (
    <div className="hud topbar">
      <div className="title card-bit">
        <h1>THE LAST CITY</h1>
        <div className="sub">3D town · React + three.js · not wired to the game</div>
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

function DayPill({
  time,
  auto,
  day,
  raidSoon,
  raidActive,
}: {
  time: TimeOfDay;
  auto: boolean;
  day: number;
  raidSoon: boolean;
  raidActive: boolean;
}) {
  const def = TIMES.find((t) => t.id === time)!;
  return (
    <div className={time === 'dawn' ? 'hud day card-bit glow' : 'hud day card-bit'}>
      <span className="day-n">DAY {day}</span>
      <div className="dn">
        {def.icon} {def.label}
        {auto && <span className="auto-tag">AUTO</span>}
      </div>
      <div className="dt">{def.tagline}</div>
      {raidActive ? (
        <div className="dp-warn">⚔ RAID AT THE GATE</div>
      ) : (
        raidSoon && <div className="dp-warn">⚠ raiders sighted beyond the wall</div>
      )}
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

type LiveState = {
  pledged: number;
  pledgedToday: boolean;
  onPledge: () => void;
  talk: TalkMsg[];
  hiCooldown: boolean;
  onSayHi: () => void;
  crisisVotes: Record<CrisisOptId, number>;
  myCrisisVote: CrisisOptId | null;
  onCrisisVote: (id: CrisisOptId) => void;
  councilVotes: Record<PlanId, number>;
  raidDays: number;
  events: LiveEvent[];
};

function LiveTab({
  pledged,
  pledgedToday,
  onPledge,
  talk,
  hiCooldown,
  onSayHi,
  crisisVotes,
  myCrisisVote,
  onCrisisVote,
  councilVotes,
  raidDays,
  events,
}: LiveState) {
  const mkPct = Math.round((pledged / MARKED_GOAL) * 100);
  const crisisTotal = Math.max(1, crisisVotes.a + crisisVotes.b + crisisVotes.c);
  const councilMax = Math.max(1, ...PLAN_IDS.map((id) => councilVotes[id]));
  const raidSoon = raidDays <= 1;
  return (
    <>
      <div className="p-sec">THE MARKED</div>
      <div className="marked">
        <div className="mk-head">
          <span className="mi">🧒</span>
          <span className="mn">Mira, the greenhouse child</span>
        </div>
        <div className="mk-bar">
          <i style={{ width: `${mkPct}%` }} />
        </div>
        <div className="mk-meta">
          <span>
            {pledged} / {MARKED_GOAL} resolve
          </span>
          <span>{pledgedToday ? "You've helped today" : `${mkPct}% saved`}</span>
        </div>
        <div className="mk-pledges">
          {PLEDGES.map((p) => (
            <button key={p.id} type="button" className="mk-pledge" disabled={pledgedToday} onClick={onPledge}>
              {p.icon} {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-sec">THE COMMENTS — SAY HI</div>
      <div className="talk">
        {talk.map((m) => (
          <div key={m.key} className={m.you ? 'tk you' : 'tk'}>
            <span className="ta">{m.who}</span>
            <span className="tx">{m.text}</span>
          </div>
        ))}
        <button type="button" className="say-hi" disabled={hiCooldown} onClick={onSayHi}>
          {hiCooldown ? '…' : '👋 SAY HI IN THE COMMENTS'}
        </button>
      </div>

      <div className="p-sec">TODAY'S CRISIS</div>
      <div className="crisis">
        <div className="cr-title">⚔️ The Convoy at the Gate</div>
        {CRISIS_OPTS.map((o) => {
          const pct = Math.round((crisisVotes[o.id] / crisisTotal) * 100);
          return (
            <button
              key={o.id}
              type="button"
              className={myCrisisVote === o.id ? 'cr-opt mine' : 'cr-opt'}
              disabled={myCrisisVote !== null}
              onClick={() => onCrisisVote(o.id)}
            >
              <span className="cr-nm">{o.nm}</span>
              <span className="cr-fx">{o.fx}</span>
              <span className="cr-pct">{pct}%</span>
            </button>
          );
        })}
      </div>

      <div className="p-sec">THE COUNCIL</div>
      <div className="council">
        {PLANS.map((p) => {
          const v = councilVotes[p.id];
          const lead = v === councilMax;
          return (
            <div key={p.id} className={lead ? 'co-plan lead' : 'co-plan'}>
              <span className="co-nm">{p.nm}</span>
              <div className="co-bar">
                <i style={{ width: `${Math.round((v / councilMax) * 100)}%` }} />
              </div>
              <span className="co-v">{v}</span>
            </div>
          );
        })}
      </div>

      <div className="p-sec">RAID WATCH</div>
      <div className={raidSoon ? 'raid soon' : 'raid'}>
        <span className="raid-ic">☠️</span>
        <div className="raid-body">
          <div className="raid-count">{raidSoon ? 'RAID AT NEXT DAWN' : `RAID IN ${raidDays} DAWNS`}</div>
          <div className="raid-note">guard the wall — every point of defense counts</div>
        </div>
      </div>

      <div className="p-sec">LIVE EVENTS</div>
      <div className="events">
        {events.map((e, i) => (
          <div key={e.key} className={i === 0 ? 'ev new' : 'ev'}>
            <span className="ei">{e.icon}</span>
            <span className="et">{e.text}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function CityDashboard({
  open,
  setOpen,
  tab,
  setTab,
  pois,
  levels,
  vitals,
  selectedName,
  onVisit,
  live,
}: {
  open: boolean;
  setOpen: (b: boolean) => void;
  tab: 'city' | 'live';
  setTab: (t: 'city' | 'live') => void;
  pois: PoiInfo[];
  levels: Record<string, number>;
  vitals: Vitals;
  selectedName: string | null;
  onVisit: (name: string) => void;
  live: LiveState;
}) {
  return (
    <>
      <button type="button" className="hud dash-fab card-bit" onClick={() => setOpen(!open)} aria-expanded={open}>
        ▦ CITY
      </button>
      <div className={open ? 'hud dash card-bit on' : 'hud dash card-bit'}>
        <div className="p-head">
          <span>CITY</span>
          <button type="button" className="p-x" onClick={() => setOpen(false)} aria-label="Close dashboard">
            ✕
          </button>
        </div>

        <div className="dash-tabs">
          <button type="button" className={tab === 'city' ? 'dash-tab on' : 'dash-tab'} onClick={() => setTab('city')} aria-pressed={tab === 'city'}>
            CITY
          </button>
          <button type="button" className={tab === 'live' ? 'dash-tab on' : 'dash-tab'} onClick={() => setTab('live')} aria-pressed={tab === 'live'}>
            LIVE
          </button>
        </div>

        {tab === 'live' && <LiveTab {...live} />}

        {tab === 'city' && (
          <>
            <div className="p-sec">CITY VITALS</div>
            <div className="vits">
              {VITAL_DEFS.map((r) => {
                const v = vitals[r.k];
                const pct = Math.min(100, (v / r.max) * 100);
                const col = vitColor(pct, r.danger);
                return (
                  <div key={r.k} className="vit">
                    <div className="t">
                      <span className="k">
                        {r.icon} {r.k}
                      </span>
                      <span className="v" style={{ color: col }}>
                        {v}
                        <em>/{r.max}</em>
                      </span>
                    </div>
                    <div className="track">
                      <i style={{ width: `${pct}%`, background: col }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-sec">DISTRICTS — TAP TO VISIT</div>
            <div className="districts">
              {pois.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className={selectedName === p.name ? 'district on' : 'district'}
                  onClick={() => onVisit(p.name)}
                  title={p.blurb}
                >
                  <span className="di">{p.icon}</span>
                  <span className="dn2">
                    {p.name}
                    <i>LVL {levels[p.name] ?? p.level}</i>
                  </span>
                  <span className="go">→</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function BuildingChip({
  meta,
  levels,
  food,
  onUpgrade,
}: {
  meta: BuildingMeta | null;
  levels: Record<string, number>;
  food: number;
  onUpgrade: (name: string) => void;
}) {
  const [shown, setShown] = useState<BuildingMeta | null>(meta);
  useEffect(() => {
    if (meta) setShown(meta);
  }, [meta]);
  const level = shown ? (levels[shown.name] ?? shown.level) : 1;
  const canAfford = food >= UPGRADE_COST;
  return (
    <div className={meta ? 'hud chip card-bit on' : 'hud chip card-bit'}>
      <div className="nm">{shown?.name ?? ''}</div>
      <div className="lv">LEVEL {level}</div>
      <div className="bl">{shown?.blurb ?? ''}</div>
      <button
        type="button"
        className="up"
        disabled={!canAfford}
        title={canAfford ? undefined : 'not enough food'}
        onClick={() => {
          if (shown) onUpgrade(shown.name);
        }}
      >
        ⬆ UPGRADE — 🍞 {UPGRADE_COST}
      </button>
    </div>
  );
}

function BuildDock({
  buildMode,
  onToggle,
  toastText,
  toastOn,
}: {
  buildMode: boolean;
  onToggle: () => void;
  toastText: string;
  toastOn: boolean;
}) {
  return (
    <div className="hud dock">
      <div className="credits">villagers &amp; wildlife: three.js example models (threejs.org)</div>
      <div style={{ position: 'relative' }}>
        <div className={toastOn ? 'toast on' : 'toast'}>{toastText}</div>
        <button
          type="button"
          className={buildMode ? 'build armed' : 'build'}
          onClick={onToggle}
          aria-label="Build"
          aria-pressed={buildMode}
        >
          🔨
        </button>
      </div>
      <span className="btag">BUILD</span>
    </div>
  );
}

function RaidBanner({ phase }: { phase: RaidPhase }) {
  const cls =
    phase === 'idle'
      ? 'hud raid-banner card-bit'
      : phase === 'breach'
        ? 'hud raid-banner card-bit on bad'
        : 'hud raid-banner card-bit on';
  const title = phase === 'held' ? '🛡 THE WALL HELD' : phase === 'breach' ? '🔥 THE WALL WAS BREACHED' : '⚔ RAID AT THE GATE';
  const sub =
    phase === 'held'
      ? 'threat −38 · defense −8 · food −6'
      : phase === 'breach'
        ? '−8 souls · food −18 · defense −15'
        : 'the wall decides tonight…';
  return (
    <div className={cls}>
      <div className="rb-t">{title}</div>
      <div className="rb-s">{sub}</div>
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
  const [pois, setPois] = useState<PoiInfo[]>([]);
  const [time, setTimeState] = useState<TimeOfDay>('dawn');
  const [auto, setAuto] = useState(true);
  const [villagers, setVillagersState] = useState(3);
  const [companions, setCompanions] = useState<Record<CompanionKind, boolean>>({
    horse: true,
    flamingo: true,
    parrot: true,
    stork: true,
  });
  const [panelOpen, setPanelOpen] = useState(true);
  const [dashOpen, setDashOpen] = useState(true);
  const [dashTab, setDashTab] = useState<'city' | 'live'>('live');
  // ---- the mini-game state machines ----
  const [vitals, setVitals] = useState<Vitals>(START_VITALS);
  const [population, setPopulation] = useState(143);
  const [day, setDay] = useState(5);
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [buildMode, setBuildMode] = useState(false);
  const [raidPhase, setRaidPhase] = useState<RaidPhase>('idle');
  const [talk, setTalk] = useState<TalkMsg[]>(() => [
    { who: 'u/saltcedar', text: 'watch fires lit, see you at dawn 🔥', key: 1 },
    { who: 'u/ashen_fox', text: "gm city, who's on wall duty?", key: 0 },
  ]);
  const [hiCooldown, setHiCooldown] = useState(false);
  const [toastText, setToastText] = useState('');
  const [toastOn, setToastOn] = useState(false);
  // LIVE tab state — all demo numbers, drifting on timers.
  const [pledged, setPledged] = useState(23);
  const [pledgedToday, setPledgedToday] = useState(false);
  const [crisisVotes, setCrisisVotes] = useState<Record<CrisisOptId, number>>({ a: 12, b: 5, c: 8 });
  const [myCrisisVote, setMyCrisisVote] = useState<CrisisOptId | null>(null);
  const [councilVotes, setCouncilVotes] = useState<Record<PlanId, number>>({
    prepare_raid: 9,
    stockpile_food: 6,
    repair_power: 4,
  });
  const [raidDays, setRaidDays] = useState(5);
  // seed newest-first: DRAMA[2] is the freshest, rotation continues at index 3
  const [events, setEvents] = useState<LiveEvent[]>(() => [2, 1, 0].map((i) => ({ ...DRAMA[i]!, key: i })));
  const handleRef = useRef<VillageHandle | null>(null);
  const manualPauseRef = useRef(0); // Date.now() until which the auto-ramp holds off
  const pledgedRef = useRef(false); // click guard (double-tap before re-render)
  const votedRef = useRef(false);
  const nextEvRef = useRef(3);
  const evKeyRef = useRef(100); // monotonic key for every feed entry
  const talkKeyRef = useRef(10);
  const timeRef = useRef<TimeOfDay>('dawn'); // current phase, readable inside intervals
  const dayRef = useRef(5);
  const vitalsRef = useRef<Vitals>(START_VITALS); // fresh reads in callbacks/timers
  const levelsRef = useRef<Record<string, number>>({});
  const buildModeRef = useRef(false);
  const raidPhaseRef = useRef<RaidPhase>('idle');
  const raidDaysRef = useRef(5);
  const raidTimersRef = useRef<number[]>([]);
  const hiCooldownRef = useRef(false);
  const hiReplyIdxRef = useRef(0);
  const hiReplyTimerRef = useRef<number | null>(null);
  const hiCooldownTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    timeRef.current = time;
  }, [time]);
  useEffect(() => {
    vitalsRef.current = vitals;
  }, [vitals]);
  useEffect(() => {
    levelsRef.current = levels;
  }, [levels]);

  // ---- feed helpers ----
  const pushEvent = useCallback((icon: string, text: string) => {
    const key = evKeyRef.current;
    evKeyRef.current += 1;
    setEvents((prev) => [{ icon, text, key }, ...prev].slice(0, 6));
  }, []);
  const pushTalk = useCallback((who: string, text: string, you = false) => {
    const key = talkKeyRef.current;
    talkKeyRef.current += 1;
    setTalk((prev) => [{ who, text, you, key }, ...prev].slice(0, 7));
  }, []);
  const popToast = useCallback((text: string) => {
    setToastText(text);
    setToastOn(true);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastOn(false), 2200);
  }, []);

  const onReady = useCallback((h: VillageHandle) => {
    handleRef.current = h;
  }, []);
  const onProgress = useCallback((p: number) => setPct(p), []);
  const onLoad = useCallback(() => setLoaded(true), []);
  const onSelect = useCallback((meta: BuildingMeta | null) => setSelected(meta), []);
  const onPois = useCallback((list: PoiInfo[]) => {
    setPois(list);
    // seed the live level map from the scene directory (never clobber upgrades)
    setLevels((prev) => {
      const next = { ...prev };
      for (const p of list) if (next[p.name] === undefined) next[p.name] = p.level;
      return next;
    });
  }, []);

  // scene-generated villager chatter → the comments feed
  const onChat = useCallback(
    (who: string, text: string) => {
      pushTalk(who, text);
    },
    [pushTalk],
  );

  // scene reports a placed hut → grow the city, spend food, exit build mode
  const onBuilt = useCallback(
    (x: number, _z: number) => {
      setPopulation((p) => p + 4);
      setVitals((v) => ({ ...v, FOOD: clampVit('FOOD', v.FOOD - 5) }));
      pushEvent('🔨', `A new hut rose in the ${x < 0 ? 'west' : 'east'} quarter — a family moves in.`);
      popToast('Hut raised — +4 souls');
      buildModeRef.current = false;
      setBuildMode(false);
      (handleRef.current as any)?.setBuildMode?.(false);
    },
    [pushEvent, popToast],
  );

  const setTime = useCallback((t: TimeOfDay) => {
    timeRef.current = t;
    setTimeState(t);
    handleRef.current?.setTimeOfDay(t);
  }, []);
  // Functional updates + effect-driven sync: rapid +/- taps land between React
  // renders, so reading `villagers` in a click handler would use stale state.
  // A manual tap also pauses the auto-ramp for 30s so it doesn't fight the user.
  const bumpVillagers = useCallback((delta: number) => {
    manualPauseRef.current = Date.now() + 30_000;
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

  const visitDistrict = useCallback((name: string) => {
    handleRef.current?.focusOn(name);
  }, []);

  // AUTO: the day slowly turns — night → dawn → day → dusk, ~12s per phase.
  // Each transition INTO dawn is a new day: day counter +1 + a chronicle line.
  useEffect(() => {
    if (!auto) return undefined;
    const id = window.setInterval(() => {
      const next = TIME_ORDER[(TIME_ORDER.indexOf(timeRef.current) + 1) % TIME_ORDER.length]!;
      timeRef.current = next;
      setTimeState(next);
      handleRef.current?.setTimeOfDay(next);
      if (next === 'dawn') {
        dayRef.current += 1;
        setDay(dayRef.current);
        pushEvent('🌅', `Dawn broke over the city — day ${dayRef.current}, still standing.`);
      }
    }, 12000);
    return () => window.clearInterval(id);
  }, [auto, pushEvent]);

  // AUTO: villager count random-walks ±1 within [3, MAX_VILLAGERS] every ~6s.
  // Holds off while manualPauseRef says a human just used the stepper.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (Date.now() < manualPauseRef.current) return;
      const delta = Math.random() < 0.5 ? -1 : 1;
      setVillagersState((v) => Math.max(3, Math.min(MAX_VILLAGERS, v + delta)));
    }, 6000);
    return () => window.clearInterval(id);
  }, []);

  // LIVE tab handlers — one pledge / one crisis vote per "day" (session).
  const onPledge = useCallback(() => {
    if (pledgedRef.current) return;
    pledgedRef.current = true;
    setPledged((p) => Math.min(MARKED_GOAL, p + 3));
    setPledgedToday(true);
    // optional scene API (added by another agent) — never crash if absent
    (handleRef.current as any)?.pulseMarked?.();
  }, []);
  const onCrisisVote = useCallback((id: CrisisOptId) => {
    if (votedRef.current) return;
    votedRef.current = true;
    setMyCrisisVote(id);
    setCrisisVotes((v) => ({ ...v, [id]: v[id] + 1 }));
  }, []);

  // SAY HI — post to the comments, wave in the scene, get a scripted reply.
  const onSayHi = useCallback(() => {
    if (hiCooldownRef.current) return;
    hiCooldownRef.current = true;
    setHiCooldown(true);
    pushTalk('u/you', 'hii 👋', true);
    (handleRef.current as any)?.say?.('hii 👋');
    const reply = HI_REPLIES[hiReplyIdxRef.current % HI_REPLIES.length]!;
    hiReplyIdxRef.current += 1;
    if (hiReplyTimerRef.current !== null) window.clearTimeout(hiReplyTimerRef.current);
    hiReplyTimerRef.current = window.setTimeout(() => {
      pushTalk(reply.who, reply.text);
      (handleRef.current as any)?.say?.(reply.text);
    }, 2500);
    if (hiCooldownTimerRef.current !== null) window.clearTimeout(hiCooldownTimerRef.current);
    hiCooldownTimerRef.current = window.setTimeout(() => {
      hiCooldownRef.current = false;
      setHiCooldown(false);
    }, 6000);
  }, [pushTalk]);

  // BUILD — toggle placement mode in the scene (fallback toast if the scene
  // API isn't there yet).
  const toggleBuild = useCallback(() => {
    const h = handleRef.current as any;
    if (!h?.setBuildMode) {
      popToast('Building placement — coming soon');
      return;
    }
    const on = !buildModeRef.current;
    buildModeRef.current = on;
    setBuildMode(on);
    h.setBuildMode?.(on);
  }, [popToast]);

  // UPGRADE — bump a district's level for food; flash it in the scene.
  const onUpgrade = useCallback(
    (name: string) => {
      if (vitalsRef.current.FOOD < UPGRADE_COST) return;
      const n = (levelsRef.current[name] ?? 1) + 1;
      setLevels((prev) => ({ ...prev, [name]: n }));
      setVitals((v) => ({ ...v, FOOD: clampVit('FOOD', v.FOOD - UPGRADE_COST) }));
      (handleRef.current as any)?.flashDistrict?.(name);
      pushEvent('⬆', `${name} upgraded to LVL ${n}.`);
    },
    [pushEvent],
  );

  // RAID — 9s of dread, then the wall decides on CURRENT defense.
  const startRaid = useCallback(() => {
    if (raidPhaseRef.current !== 'idle') return;
    raidPhaseRef.current = 'incoming';
    setRaidPhase('incoming');
    (handleRef.current as any)?.setRaidWatch?.(true);
    raidTimersRef.current.push(
      window.setTimeout(() => {
        const held = vitalsRef.current.DEFENSE >= 40;
        if (held) {
          setVitals((v) => ({
            ...v,
            THREAT: clampVit('THREAT', 30),
            DEFENSE: clampVit('DEFENSE', v.DEFENSE - 8),
            FOOD: clampVit('FOOD', v.FOOD - 6),
          }));
          pushEvent('🛡', 'The raiders broke on the south wall. The city holds.');
          raidPhaseRef.current = 'held';
          setRaidPhase('held');
        } else {
          setPopulation((p) => Math.max(0, p - 8));
          setVitals((v) => ({
            ...v,
            THREAT: clampVit('THREAT', 45),
            DEFENSE: clampVit('DEFENSE', v.DEFENSE - 15),
            FOOD: clampVit('FOOD', v.FOOD - 18),
            MORALE: clampVit('MORALE', v.MORALE - 10),
          }));
          pushEvent('🔥', 'Raiders breached the gate before the watch pushed them out.');
          raidPhaseRef.current = 'breach';
          setRaidPhase('breach');
        }
        // result banner lingers 6s, then the countdown resets
        raidTimersRef.current.push(
          window.setTimeout(() => {
            raidPhaseRef.current = 'idle';
            setRaidPhase('idle');
            (handleRef.current as any)?.setRaidWatch?.(false);
            raidDaysRef.current = 5;
            setRaidDays(5);
          }, 6000),
        );
      }, 9000),
    );
  }, [pushEvent]);

  // LIVE tab simulation — every number drifts on its own clock:
  //   pledges +1 / ~7s · crisis votes +1 / ~9s · council votes +1 / ~11s ·
  //   raid countdown −1 / 48s (threat creeps +2 per tick; at 0 the raid plays
  //   out) · event feed rotates / ~8s · ambient vitals drift / 20s ·
  //   a survivor reaches the gate / ~25s.
  useEffect(() => {
    const ids: number[] = [
      window.setInterval(() => setPledged((p) => Math.min(MARKED_GOAL, p + 1)), 7000),
      window.setInterval(() => {
        const id = CRISIS_IDS[Math.floor(Math.random() * CRISIS_IDS.length)]!;
        setCrisisVotes((v) => ({ ...v, [id]: v[id] + 1 }));
      }, 9000),
      window.setInterval(() => {
        const id = PLAN_IDS[Math.floor(Math.random() * PLAN_IDS.length)]!;
        setCouncilVotes((v) => ({ ...v, [id]: v[id] + 1 }));
      }, 11000),
      window.setInterval(() => {
        setVitals((v) => ({ ...v, THREAT: clampVit('THREAT', v.THREAT + 2) }));
        if (raidPhaseRef.current !== 'idle') return; // a raid is already playing out
        const d = raidDaysRef.current - 1;
        if (d <= 0) {
          raidDaysRef.current = 0;
          setRaidDays(0);
          startRaid();
        } else {
          raidDaysRef.current = d;
          setRaidDays(d);
        }
      }, 48000),
      window.setInterval(() => {
        const idx = nextEvRef.current;
        nextEvRef.current = idx + 1;
        const src = DRAMA[idx % DRAMA.length]!;
        pushEvent(src.icon, src.text);
      }, 8000),
      // ambient vitals drift: food −1..+2, power ±1, clamped ≥ 0
      window.setInterval(() => {
        setVitals((v) => ({
          ...v,
          FOOD: clampVit('FOOD', v.FOOD + (Math.floor(Math.random() * 4) - 1)),
          POWER: clampVit('POWER', v.POWER + (Math.random() < 0.5 ? -1 : 1)),
        }));
      }, 20000),
      // a survivor reaches the gate every ~25s
      window.setInterval(() => {
        setPopulation((p) => p + 1);
        pushEvent('🚶', 'a survivor reaches the gate');
      }, 25000),
    ];
    return () => ids.forEach((id) => window.clearInterval(id));
  }, [pushEvent, startRaid]);

  // one-shot timers (say-hi reply/cooldown, toast, raid sequence) — swept on unmount
  useEffect(
    () => () => {
      if (hiReplyTimerRef.current !== null) window.clearTimeout(hiReplyTimerRef.current);
      if (hiCooldownTimerRef.current !== null) window.clearTimeout(hiCooldownTimerRef.current);
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
      raidTimersRef.current.forEach((id) => window.clearTimeout(id));
      raidTimersRef.current = [];
    },
    [],
  );

  // Raid watch ambience → optional scene API (defensive: the handle may not
  // have it). The active raid sequence drives setRaidWatch itself.
  useEffect(() => {
    if (raidPhaseRef.current !== 'idle') return;
    const h = handleRef.current as any;
    if (raidDays <= 1) h?.setRaidWatch?.(true);
    else if (raidDays >= 5) h?.setRaidWatch?.(false);
  }, [raidDays, loaded]);

  // QA hooks: window.__omdDemo.raidNow() / .build()
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__omdDemo = {
      raidNow: () => {
        raidDaysRef.current = 0;
        setRaidDays(0); // next countdown tick fires the raid
      },
      build: () => toggleBuild(),
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).__omdDemo;
    };
  }, [toggleBuild]);

  return (
    <>
      <VillageCanvas
        onReady={onReady}
        onProgress={onProgress}
        onLoad={onLoad}
        onSelect={onSelect}
        onPois={onPois}
        onChat={onChat}
        onBuilt={onBuilt}
      />
      <TopBar food={vitals.FOOD} power={vitals.POWER} medicine={vitals.MEDICINE} population={population} />
      <DayPill time={time} auto={auto} day={day} raidSoon={raidDays <= 1} raidActive={raidPhase === 'incoming'} />
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
      <CityDashboard
        open={dashOpen}
        setOpen={setDashOpen}
        tab={dashTab}
        setTab={setDashTab}
        pois={pois}
        levels={levels}
        vitals={vitals}
        selectedName={selected?.name ?? null}
        onVisit={visitDistrict}
        live={{
          pledged,
          pledgedToday,
          onPledge,
          talk,
          hiCooldown,
          onSayHi,
          crisisVotes,
          myCrisisVote,
          onCrisisVote,
          councilVotes,
          raidDays,
          events,
        }}
      />
      <BuildingChip meta={selected} levels={levels} food={vitals.FOOD} onUpgrade={onUpgrade} />
      <BuildDock buildMode={buildMode} onToggle={toggleBuild} toastText={toastText} toastOn={toastOn} />
      <RaidBanner phase={raidPhase} />
      {buildMode ? (
        <div className="hud build-hint card-bit">🔨 tap open ground to raise a hut · tap BUILD to cancel</div>
      ) : (
        <div className="hud hint card-bit">drag to pan · scroll / pinch to zoom · click a district</div>
      )}
      <Loader pct={pct} done={loaded} />
    </>
  );
}
