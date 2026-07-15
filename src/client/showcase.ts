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
// Durations tuned for a snappy ~47s hands-free run (the director loops, so it
// never looks "done"). storyDelayMs on the raid holds the title until the
// cinematic breach has landed.
export const SHOWCASE_SCENES: ShowcaseScene[] = [
  { id: 'opening', durationMs: 2500 },
  {
    id: 'camp',
    eyebrow: 'MAREN · THE CAMP',
    title: 'EVERY CITY STARTS WITH NOTHING.',
    line: "I'm Maren, the lantern-keeper. This is all we have — one fire, one refuge. Let's build a city before the next dawn.",
    durationMs: 3800,
  },
  {
    id: 'roles',
    eyebrow: 'MAREN · YOUR ROLE',
    title: 'CHOOSE HOW YOU SERVE THE CITY.',
    line: "Pick how you'll help: Scout, Engineer, Medic, Farmer, Guard, or Speaker. Every role keeps us alive.",
    durationMs: 4200,
  },
  {
    id: 'contribute',
    eyebrow: 'MAREN · FIRST CONTRIBUTION',
    title: 'ONE REDDITOR. ONE HOUSE.',
    line: 'Add your labor and your first home rises here — one Redditor, one house, part of our city for good.',
    durationMs: 4500,
  },
  {
    id: 'growth',
    eyebrow: 'MAREN · CITY GROWTH',
    title: 'BUILT TOGETHER. DAWN BY DAWN.',
    line: 'See how we grow? Shelter, Farm, Clinic, Watchtower, Storehouse, Council Hall — all built together.',
    durationMs: 4800,
  },
  {
    id: 'decide',
    eyebrow: 'MAREN · COMMUNITY CHOICES',
    title: 'DISCUSS. VOTE. DECIDE.',
    line: 'We decide as one: vote the crisis, back a plan, protect the Marked, and talk it through in the Hub.',
    durationMs: 5200,
  },
  {
    id: 'warning',
    eyebrow: 'MAREN · RAID WARNING',
    title: 'THE RAID ARRIVES AT DAWN.',
    line: 'A Red Signal is coming. Six dome panels are all that stand between us and the fire.',
    durationMs: 3200,
  },
  {
    id: 'raid',
    eyebrow: 'MAREN · THE RAID',
    title: 'THE DOME WAS BREACHED.',
    line: 'The dome was breached — three fireballs got through. We carry the cost together.',
    durationMs: 6500,
    storyDelayMs: 3400,
  },
  {
    id: 'rebuild',
    eyebrow: 'MAREN · REBUILDING',
    title: 'NO CITIZEN REBUILDS ALONE.',
    line: 'A home fell, but no one rebuilds alone. The whole city raises it back up.',
    durationMs: 4500,
  },
  {
    id: 'puzzle',
    eyebrow: 'MAREN · DAILY PUZZLE',
    title: 'RECONNECT THE CITY.',
    line: 'Each day, reconnect the district — turn the conduits, relight the Clinic, and earn +3 standing.',
    durationMs: 4500,
  },
  {
    id: 'dawn',
    eyebrow: 'MAREN · DAWN REPORT',
    title: 'THE CITY REMEMBERS.',
    line: 'At dawn I record it all: what we built, what we lost, and everyone who helped us survive.',
    durationMs: 3800,
  },
  { id: 'end', durationMs: 3500 },
];

export const SHOWCASE_DURATION_MS = SHOWCASE_SCENES.reduce((total, scene) => total + scene.durationMs, 0);

export const showcaseSceneFromSearch = (search: string): ShowcaseSceneId => {
  const requested = new URLSearchParams(search).get('scene');
  return SHOWCASE_SCENES.find((scene) => scene.id === requested)?.id ?? 'camp';
};

// Auto-play by default: the showcase runs itself hands-free. Opt out with
// ?autoplay=0 for frame-by-frame manual stepping.
export const showcaseAutoplayFromSearch = (search: string): boolean =>
  new URLSearchParams(search).get('autoplay') !== '0';

// Playback pace. Base durations give a snappy ~47s FAST run at speed 1; pass
// ?speed=0.5 for the ~94s SLOW cinematic pace, or ?speed=2 for a ~24s teaser.
export const showcaseSpeedFromSearch = (search: string): 0.5 | 1 | 2 => {
  const raw = Number(new URLSearchParams(search).get('speed'));
  return raw === 0.5 || raw === 2 ? raw : 1;
};

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
