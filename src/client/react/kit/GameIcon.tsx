// GAME ICON — a small, cohesive pixel-SVG icon family for the persistent
// navigation. Monochrome (uses currentColor) so each icon inherits the nav
// item's own color state (gold when active, muted otherwise) and stays on-theme
// with the Silkscreen pixel aesthetic — unlike OS emoji, which render
// differently per platform and clash with the retro look. 24×24 pixel grid,
// crisp edges. Deliberately scoped to the nav; content emoji stay as accents.

import type { ReactElement } from 'react';

export type NavIconId = 'home' | 'crisis' | 'feed' | 'world' | 'you';

const PATHS: Record<NavIconId, ReactElement> = {
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
};

export function GameIcon({ id, size = 17 }: { id: NavIconId; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      shapeRendering="crispEdges"
      fill="currentColor"
      role="img"
      aria-label={id}
    >
      {PATHS[id]}
    </svg>
  );
}
