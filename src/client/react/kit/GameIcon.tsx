// GAME ICON — a small, cohesive pixel-SVG icon family for the game UI.
// Monochrome (uses currentColor) so each icon inherits its context's color
// state (gold when active, muted otherwise) and stays on-theme with the
// Silkscreen pixel aesthetic — unlike OS emoji, which render differently per
// platform and clash with the retro look. 24×24 pixel grid, crisp edges.
// Covers the nav plus the core resources/stats and a few recurring UI glyphs;
// emoji inside player-facing prose (chronicle lines, toasts) stay as accents.

import type { ReactElement } from 'react';

export type NavIconId = 'home' | 'crisis' | 'feed' | 'world' | 'you';

export type StatIconId =
  | 'population'
  | 'food'
  | 'power'
  | 'medicine'
  | 'morale'
  | 'threat'
  | 'defense';

export type GameIconId = NavIconId | StatIconId | 'dawn' | 'candle' | 'expedition' | 'wave' | 'lock';

const PATHS: Record<GameIconId, ReactElement> = {
  // a house: roof + body + door
  home: (
    <>
      <rect x="11" y="3" width="2" height="2" />
      <rect x="9" y="5" width="6" height="2" />
      <rect x="7" y="7" width="10" height="2" />
      <rect x="5" y="9" width="14" height="2" />
      <rect x="7" y="11" width="10" height="9" />
      <rect x="10" y="14" width="4" height="6" fill="var(--bg1)" />
    </>
  ),
  // crossed swords
  crisis: (
    <>
      <rect x="4" y="5" width="2" height="2" />
      <rect x="6" y="7" width="2" height="2" />
      <rect x="8" y="9" width="2" height="2" />
      <rect x="10" y="11" width="4" height="2" />
      <rect x="14" y="9" width="2" height="2" />
      <rect x="16" y="7" width="2" height="2" />
      <rect x="18" y="5" width="2" height="2" />
      <rect x="10" y="13" width="2" height="2" />
      <rect x="12" y="13" width="2" height="2" />
      <rect x="8" y="15" width="3" height="2" />
      <rect x="13" y="15" width="3" height="2" />
      <rect x="6" y="17" width="3" height="2" />
      <rect x="15" y="17" width="3" height="2" />
    </>
  ),
  // broadcast: a signal tower with waves
  feed: (
    <>
      <rect x="11" y="9" width="2" height="11" />
      <rect x="9" y="18" width="6" height="2" />
      <rect x="10" y="7" width="4" height="3" rx="1" />
      <rect x="6" y="5" width="2" height="2" />
      <rect x="5" y="7" width="2" height="4" />
      <rect x="16" y="5" width="2" height="2" />
      <rect x="17" y="7" width="2" height="4" />
      <rect x="3" y="4" width="2" height="2" />
      <rect x="19" y="4" width="2" height="2" />
    </>
  ),
  // globe: circle with a meridian + parallel
  world: (
    <>
      <rect x="9" y="3" width="6" height="2" />
      <rect x="7" y="5" width="2" height="2" />
      <rect x="15" y="5" width="2" height="2" />
      <rect x="5" y="7" width="2" height="10" />
      <rect x="17" y="7" width="2" height="10" />
      <rect x="7" y="17" width="2" height="2" />
      <rect x="15" y="17" width="2" height="2" />
      <rect x="9" y="19" width="6" height="2" />
      <rect x="11" y="5" width="2" height="14" />
      <rect x="6" y="9" width="12" height="2" />
      <rect x="6" y="13" width="12" height="2" />
    </>
  ),
  // a medal: ribbon + disc
  you: (
    <>
      <rect x="8" y="3" width="2" height="5" />
      <rect x="14" y="3" width="2" height="5" />
      <rect x="10" y="8" width="4" height="2" />
      <rect x="9" y="10" width="6" height="2" />
      <rect x="7" y="12" width="10" height="6" />
      <rect x="9" y="18" width="6" height="2" />
      <rect x="10" y="14" width="4" height="2" fill="var(--bg1)" />
    </>
  ),
  // two citizens side by side
  population: (
    <>
      <rect x="5" y="4" width="5" height="5" />
      <rect x="3" y="10" width="9" height="10" />
      <rect x="14" y="6" width="5" height="5" />
      <rect x="13" y="12" width="9" height="8" />
    </>
  ),
  // a scored bread loaf
  food: (
    <>
      <rect x="7" y="6" width="10" height="2" />
      <rect x="5" y="8" width="14" height="2" />
      <rect x="3" y="10" width="18" height="8" />
      <rect x="7" y="11" width="2" height="5" fill="var(--bg1)" />
      <rect x="11" y="11" width="2" height="5" fill="var(--bg1)" />
      <rect x="15" y="11" width="2" height="5" fill="var(--bg1)" />
    </>
  ),
  // a lightning bolt
  power: (
    <>
      <rect x="13" y="2" width="4" height="2" />
      <rect x="11" y="4" width="5" height="2" />
      <rect x="9" y="6" width="5" height="2" />
      <rect x="7" y="8" width="5" height="2" />
      <rect x="6" y="10" width="12" height="2" />
      <rect x="10" y="12" width="6" height="2" />
      <rect x="9" y="14" width="5" height="2" />
      <rect x="8" y="16" width="4" height="2" />
      <rect x="7" y="18" width="3" height="2" />
      <rect x="6" y="20" width="2" height="2" />
    </>
  ),
  // a med kit: handle + box with a cross cut out
  medicine: (
    <>
      <rect x="9" y="5" width="6" height="3" />
      <rect x="3" y="8" width="18" height="12" />
      <rect x="11" y="10" width="2" height="8" fill="var(--bg1)" />
      <rect x="8" y="13" width="8" height="2" fill="var(--bg1)" />
    </>
  ),
  // a smiling face
  morale: (
    <>
      <rect x="8" y="3" width="8" height="2" />
      <rect x="6" y="5" width="12" height="2" />
      <rect x="4" y="7" width="16" height="10" />
      <rect x="6" y="17" width="12" height="2" />
      <rect x="8" y="19" width="8" height="2" />
      <rect x="8" y="9" width="2" height="3" fill="var(--bg1)" />
      <rect x="14" y="9" width="2" height="3" fill="var(--bg1)" />
      <rect x="8" y="14" width="8" height="2" fill="var(--bg1)" />
    </>
  ),
  // a skull: dome + jaw + teeth, hollow eyes
  threat: (
    <>
      <rect x="6" y="3" width="12" height="2" />
      <rect x="4" y="5" width="16" height="9" />
      <rect x="6" y="14" width="12" height="3" />
      <rect x="7" y="17" width="2" height="3" />
      <rect x="11" y="17" width="2" height="3" />
      <rect x="15" y="17" width="2" height="3" />
      <rect x="7" y="8" width="3" height="4" fill="var(--bg1)" />
      <rect x="14" y="8" width="3" height="4" fill="var(--bg1)" />
      <rect x="11" y="11" width="2" height="2" fill="var(--bg1)" />
    </>
  ),
  // a shield tapering to a point, with a center stripe
  defense: (
    <>
      <rect x="4" y="3" width="16" height="9" />
      <rect x="5" y="12" width="14" height="3" />
      <rect x="7" y="15" width="10" height="3" />
      <rect x="9" y="18" width="6" height="2" />
      <rect x="10" y="20" width="4" height="2" />
      <rect x="11" y="6" width="2" height="9" fill="var(--bg1)" />
    </>
  ),
  // a sunrise: rays + half sun over the horizon
  dawn: (
    <>
      <rect x="11" y="4" width="2" height="4" />
      <rect x="5" y="7" width="2" height="2" />
      <rect x="17" y="7" width="2" height="2" />
      <rect x="2" y="11" width="3" height="2" />
      <rect x="19" y="11" width="3" height="2" />
      <rect x="9" y="10" width="6" height="2" />
      <rect x="7" y="12" width="10" height="4" />
      <rect x="2" y="18" width="20" height="2" />
    </>
  ),
  // a lit candle: flame + body + base
  candle: (
    <>
      <rect x="11" y="2" width="2" height="2" />
      <rect x="10" y="4" width="4" height="3" />
      <rect x="8" y="9" width="8" height="11" />
      <rect x="11" y="12" width="2" height="4" fill="var(--bg1)" />
      <rect x="6" y="20" width="12" height="2" />
    </>
  ),
  // an expedition pack: straps + pack with a flap seam and buckle
  expedition: (
    <>
      <rect x="9" y="3" width="2" height="3" />
      <rect x="13" y="3" width="2" height="3" />
      <rect x="5" y="6" width="14" height="14" />
      <rect x="5" y="11" width="14" height="2" fill="var(--bg1)" />
      <rect x="11" y="15" width="2" height="3" fill="var(--bg1)" />
    </>
  ),
  // a megaphone: cone widening right + handle + sound tick
  wave: (
    <>
      <rect x="4" y="10" width="4" height="5" />
      <rect x="8" y="8" width="4" height="9" />
      <rect x="12" y="6" width="4" height="13" />
      <rect x="17" y="9" width="2" height="2" />
      <rect x="18" y="12" width="3" height="2" />
      <rect x="17" y="15" width="2" height="2" />
      <rect x="5" y="15" width="3" height="5" />
    </>
  ),
  // a padlock: shackle + body with a keyhole
  lock: (
    <>
      <rect x="8" y="3" width="8" height="2" />
      <rect x="7" y="5" width="2" height="5" />
      <rect x="15" y="5" width="2" height="5" />
      <rect x="5" y="10" width="14" height="10" />
      <rect x="11" y="13" width="2" height="4" fill="var(--bg1)" />
    </>
  ),
};

export function GameIcon({ id, size = 17 }: { id: GameIconId; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      shapeRendering="crispEdges"
      fill="currentColor"
      role="img"
      aria-label={id}
      // sits on the text baseline when used inline; ignored inside flex rows
      style={{ verticalAlign: '-0.15em', flex: 'none' }}
    >
      {PATHS[id]}
    </svg>
  );
}
