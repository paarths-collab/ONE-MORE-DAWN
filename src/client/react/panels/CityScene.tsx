import type { InitResponse } from '../../../shared/types';
import { ROLE_DEFS } from '../defs';

// CITY SCENE — the living ambient skyline strip at the top of the dashboard.
// Pure CSS + emoji (no image assets, no timers): a dawn sky, two rows of
// silhouette buildings with lit windows, chimney smoke, a survivor pin, and
// state-reactive weather driven by city.power / city.threat / raidInDays /
// city.morale. Design intent: docs/design/One More Dawn UI.dc.html
// ("CITY WORLD" backdrop — isometric city view, art drops here).

type SceneBuilding = {
  /** relative width (flex-grow) */
  grow: number;
  /** height as % of the strip */
  h: number;
  shade: 'a' | 'b' | 'c';
  windows: boolean;
  chimney?: boolean;
  antenna?: boolean;
};

// Far skyline — hazy silhouettes, no windows.
const BACK_ROW: readonly SceneBuilding[] = [
  { grow: 1.6, h: 52, shade: 'a', windows: false },
  { grow: 1.0, h: 68, shade: 'a', windows: false },
  { grow: 1.4, h: 46, shade: 'a', windows: false },
  { grow: 0.9, h: 74, shade: 'a', windows: false },
  { grow: 1.6, h: 58, shade: 'a', windows: false },
  { grow: 1.1, h: 66, shade: 'a', windows: false },
  { grow: 1.5, h: 42, shade: 'a', windows: false },
  { grow: 1.0, h: 60, shade: 'a', windows: false },
];

// Near row — the lived-in city: windows, one chimney, one antenna.
const FRONT_ROW: readonly SceneBuilding[] = [
  { grow: 1.3, h: 34, shade: 'b', windows: true },
  { grow: 1.0, h: 54, shade: 'c', windows: true, antenna: true },
  { grow: 1.5, h: 28, shade: 'b', windows: true, chimney: true },
  { grow: 1.1, h: 46, shade: 'c', windows: true },
  { grow: 1.4, h: 36, shade: 'b', windows: true },
  { grow: 0.9, h: 58, shade: 'c', windows: true },
  { grow: 1.3, h: 30, shade: 'b', windows: true, chimney: true },
  { grow: 1.0, h: 42, shade: 'c', windows: true },
];

function Building({ b }: { b: SceneBuilding }) {
  const cls = [
    'omd-scene-bld',
    `omd-scene-bld--${b.shade}`,
    b.chimney === true ? 'omd-scene-bld--chimney' : '',
    b.antenna === true ? 'omd-scene-bld--antenna' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <span className={cls} style={{ flexGrow: b.grow, height: `${b.h}%` }}>
      {b.windows && <span className="omd-scene-win" />}
      {b.chimney === true && (
        <span className="omd-scene-smokes">
          <span className="omd-scene-smoke" />
          <span className="omd-scene-smoke omd-scene-smoke--2" />
          <span className="omd-scene-smoke omd-scene-smoke--3" />
        </span>
      )}
    </span>
  );
}

/** One-line ambient status for the bottom-right corner of the scene. */
const moodOf = (data: InitResponse): { text: string; danger: boolean } => {
  const { city, raidInDays } = data;
  if (raidInDays <= 0) return { text: '⚠ the raid is at the wall', danger: true };
  if (city.threat >= 70) return { text: 'the red signal nears', danger: true };
  if (city.power < 25) return { text: 'the lights are failing', danger: false };
  if (city.morale >= 70) return { text: 'the city breathes easy', danger: false };
  return { text: 'the city holds', danger: false };
};

export function CityScene({ data }: { data: InitResponse }) {
  const { city, raidInDays, trait, player } = data;

  const lowPower = city.power < 25;
  const highThreat = city.threat >= 70;
  const raidNow = raidInDays <= 0;
  const alarm = highThreat || raidNow;

  // Threat paints the horizon red: none below 70, creeping to 0.7 at 100,
  // and near-full when the raid is at the gate tonight.
  const threatGlow = raidNow
    ? 0.85
    : highThreat
      ? 0.3 + ((Math.min(city.threat, 100) - 70) / 30) * 0.4
      : 0;

  // Morale tunes saturation: a gray, tired city vs. a bright, hopeful one.
  const moraleFilter =
    city.morale < 30
      ? 'saturate(0.55) brightness(0.96)'
      : city.morale >= 70
        ? 'saturate(1.12) brightness(1.03)'
        : undefined;

  // Gentle per-trait weather tint (optional flavor, kept subtle).
  const traitTint =
    trait.id === 'frozen'
      ? 'rgba(120, 160, 200, 0.14)'
      : trait.id === 'sick'
        ? 'rgba(120, 160, 90, 0.1)'
        : null;

  const mood = moodOf(data);
  const pinIcon = player.role !== null ? ROLE_DEFS[player.role].icon : '🧭';

  const cls = [
    'omd-scene',
    lowPower ? 'omd-scene--lowpower' : '',
    alarm ? 'omd-scene--alarm' : '',
    raidNow ? 'omd-scene--raid' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={cls} aria-label="The last city at dawn">
      <div className="omd-scene-world" style={moraleFilter !== undefined ? { filter: moraleFilter } : undefined} aria-hidden="true">
        <span className="omd-scene-sky" />
        <span className="omd-scene-sun" />
        <span className="omd-scene-row omd-scene-row--back">
          {BACK_ROW.map((b, i) => (
            <Building key={i} b={b} />
          ))}
        </span>
        <span className="omd-scene-row omd-scene-row--front">
          {FRONT_ROW.map((b, i) => (
            <Building key={i} b={b} />
          ))}
        </span>
        <span className="omd-scene-ground" />
        <span className="omd-scene-tree" style={{ left: '40%' }}>
          🌾
        </span>
        <span className="omd-scene-tree" style={{ left: '48%' }}>
          🌲
        </span>
        <span className="omd-scene-tree" style={{ left: '86%', fontSize: 14 }}>
          🌲
        </span>
        {traitTint !== null && <span className="omd-scene-tint" style={{ background: traitTint }} />}
        <span className="omd-scene-threat" style={{ opacity: threatGlow }} />
        {lowPower && <span className="omd-scene-dim" />}
        <span className="omd-scene-pin">
          <span className="omd-scene-pin-ring" />
          <span className="omd-scene-pin-face">{pinIcon}</span>
        </span>
        {raidNow && <span className="omd-scene-alarmflash" />}
      </div>
      <div className="omd-scene-caption">
        <span className="omd-scene-caption-title">THE LAST CITY · DAY {city.day}</span>
        <span className="omd-scene-caption-sub">
          {trait.label} · population {city.population} souls
        </span>
      </div>
      <div className={mood.danger ? 'omd-scene-mood omd-scene-mood--danger' : 'omd-scene-mood'}>
        {mood.text}
      </div>
    </section>
  );
}
