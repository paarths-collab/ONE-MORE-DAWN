import {
  evaluate,
  initialRotations,
  rotateEdges,
  rotateTile,
  solutionRotations,
  TILE_EDGES,
  tileCells,
  type PuzzleLevel,
} from '../shared/puzzle';

export type ShowcaseSceneId =
  | 'opening'
  | 'camp'
  | 'roles'
  | 'contribute'
  | 'growth'
  | 'decide'
  | 'warning'
  | 'raid'
  | 'rebuild'
  | 'puzzle'
  | 'dawn'
  | 'end';

export type ShowcaseScene = {
  id: ShowcaseSceneId;
  eyebrow?: string;
  title?: string;
  line?: string;
  durationMs: number;
  /** Let the raid play before its result card enters the frame. */
  storyDelayMs?: number;
};

/**
 * Local-only recording sequence. Every beat points at a real system in the
 * shipped game; this is a guided camera path, not an alternate game mode.
 */
export const SHOWCASE_SCENES: ShowcaseScene[] = [
  { id: 'opening', durationMs: 4000 },
  {
    id: 'camp',
    eyebrow: '01 · THE CAMP',
    title: 'EVERY CITY STARTS WITH NOTHING.',
    line: 'One fire. One refuge. One subreddit trying to survive another dawn.',
    durationMs: 6000,
  },
  {
    id: 'roles',
    eyebrow: '02 · YOUR ROLE',
    title: 'CHOOSE HOW YOU SERVE THE CITY.',
    line: 'Six roles. Different strengths. One shared survival.',
    durationMs: 7000,
  },
  {
    id: 'contribute',
    eyebrow: '03 · FIRST CONTRIBUTION',
    title: 'ONE REDDITOR. ONE HOUSE.',
    line: 'Add labor. Your first home joins the city, in contribution order.',
    durationMs: 8000,
  },
  {
    id: 'growth',
    eyebrow: '04 · CITY GROWTH',
    title: 'BUILT TOGETHER. DAWN BY DAWN.',
    line: 'Camp becomes Shelter, Farm, Clinic, Watchtower, Storehouse, and Council Hall.',
    durationMs: 8000,
  },
  {
    id: 'decide',
    eyebrow: '05 · COMMUNITY CHOICES',
    title: 'DISCUSS. VOTE. DECIDE.',
    line: 'Crisis vote, Council strategy, The Marked, and Reddit discussion all shape the same city.',
    durationMs: 10000,
  },
  {
    id: 'warning',
    eyebrow: '06 · RAID WARNING',
    title: 'THE RAID ARRIVES AT DAWN.',
    line: 'Six dome panels are all that stand between the city and the fire.',
    durationMs: 5000,
  },
  {
    id: 'raid',
    eyebrow: '07 · THE RAID',
    title: 'THE DOME WAS BREACHED.',
    line: 'Three fireballs pierced the shield. The city pays the price together.',
    durationMs: 11000,
    storyDelayMs: 6200,
  },
  {
    id: 'rebuild',
    eyebrow: '08 · REBUILDING',
    title: 'NO CITIZEN REBUILDS ALONE.',
    line: 'A fallen home becomes the city’s next shared labor.',
    durationMs: 9000,
  },
  {
    id: 'puzzle',
    eyebrow: '09 · DAILY PUZZLE',
    title: 'RECONNECT THE CITY.',
    line: 'Turn conduits, relight the Clinic, and earn +3 standing.',
    durationMs: 9000,
  },
  {
    id: 'dawn',
    eyebrow: '10 · DAWN REPORT',
    title: 'THE CITY REMEMBERS.',
    line: 'Dawn records what was built, lost, and saved.',
    durationMs: 6000,
  },
  { id: 'end', durationMs: 5000 },
];

export const SHOWCASE_DURATION_MS = SHOWCASE_SCENES.reduce((total, scene) => total + scene.durationMs, 0);

export const showcaseSceneFromSearch = (search: string): ShowcaseSceneId => {
  const requested = new URLSearchParams(search).get('scene');
  return SHOWCASE_SCENES.find((scene) => scene.id === requested)?.id ?? 'camp';
};

export const showcaseAutoplayFromSearch = (search: string): boolean =>
  new URLSearchParams(search).get('autoplay') === '1';

export const showcaseCleanCaptureFromSearch = (search: string): boolean =>
  new URLSearchParams(search).get('clean') === '1';

/**
 * A deterministic tap order for the real puzzle board. It follows the same
 * rotations the server validates, rather than using the Hint button as a fake
 * solver during the recording.
 */
export const showcasePuzzleTapPlan = (level: PuzzleLevel): number[] => {
  const tiles = tileCells(level);
  const target = solutionRotations(level);
  let rotations = initialRotations(level);
  const taps: number[] = [];

  tiles.forEach((tile, index) => {
    if (tile.locked) return;
    let guard = 0;
    const wanted = rotateEdges(TILE_EDGES[tile.kind], target[index] ?? 0);
    while (rotateEdges(TILE_EDGES[tile.kind], rotations[index] ?? 0) !== wanted && guard++ < 4) {
      rotations = rotateTile(level, rotations, index);
      taps.push(index);
    }
  });

  if (!evaluate(level, rotations).solved) return [];
  return taps;
};

export const isRecordingShowcase = (host: string, search: string): boolean => {
  const local = host === 'localhost' || host === '127.0.0.1';
  return local && new URLSearchParams(search).get('showcase') === '1';
};
