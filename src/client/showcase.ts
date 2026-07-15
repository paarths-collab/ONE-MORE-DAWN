export type ShowcaseSceneId =
  | 'camp'
  | 'growth'
  | 'shield'
  | 'raid'
  | 'aftermath'
  | 'rebuild'
  | 'puzzle'
  | 'dawn';

export type ShowcaseScene = {
  id: ShowcaseSceneId;
  eyebrow: string;
  title: string;
  line: string;
  details: readonly [string, string];
  durationMs: number;
};

export const SHOWCASE_SCENES: ShowcaseScene[] = [
  {
    id: 'camp',
    eyebrow: '01 · THE FIRST FIRE',
    title: 'One subreddit shares one city.',
    line: 'This is the loop: help today, face dawn together, then return to the consequence.',
    details: ['There is no private island.', 'Every player changes the same living map.'],
    durationMs: 8000,
  },
  {
    id: 'growth',
    eyebrow: '02 · THE CITY RISES',
    title: 'Accepted actions build the city for everyone.',
    line: 'Labor fills one communal build meter. When it reaches a threshold, a district appears in the Three.js city.',
    details: ['Your first accepted contribution gives you one permanent house.', 'The first contributor is remembered as the founder.'],
    durationMs: 12000,
  },
  {
    id: 'shield',
    eyebrow: '03 · PREPARE FOR DAWN',
    title: 'Daily participation becomes shared defense.',
    line: 'Each accepted city action adds to the shield reserve. At 12 points, it repairs the weakest of six dome panels.',
    details: ['Finish a daily challenge to charge one panel directly.', 'The raid tests the exact panel each fireball hits.'],
    durationMs: 10000,
  },
  {
    id: 'raid',
    eyebrow: '04 · RAID AT THE GATE',
    title: 'At dawn, the city is tested.',
    line: 'A healthy panel blocks a fireball. A depleted panel lets the strike reach the streets below.',
    details: ['Watch the six panels absorb or fail under each impact.', 'This raid breaches three panels. The result persists.'],
    durationMs: 15000,
  },
  {
    id: 'aftermath',
    eyebrow: '05 · CONSEQUENCES',
    title: 'The city records the cost.',
    line: 'This breach lost six citizens and damaged u/quiet_marrow’s home. The city creates one shared rebuild queue.',
    details: ['Named houses do not disappear from the story.', 'Everyone sees what the raid damaged.'],
    durationMs: 9000,
  },
  {
    id: 'rebuild',
    eyebrow: '06 · NO CITIZEN REBUILDS ALONE',
    title: 'The next labor rebuilds a neighbor’s home.',
    line: 'One community contribution clears the next repair. Ownership and build order remain visible after the house returns.',
    details: ['Rebuilding is collective, not a private purchase.', 'The city heals without erasing its history.'],
    durationMs: 9000,
  },
  {
    id: 'puzzle',
    eyebrow: '07 · RECONNECT THE CITY',
    title: 'The daily puzzle reconnects a district.',
    line: 'Turn conduits until power reaches every required building. The board validates the finished circuit before rewarding it.',
    details: ['A valid daily solve earns +3 standing once per player.', 'Puzzle standing and shield repair are separate systems.'],
    durationMs: 12000,
  },
  {
    id: 'dawn',
    eyebrow: '08 · ONE MORE DAWN',
    title: 'Dawn closes one day and opens the next.',
    line: 'The report keeps the raid, the rebuild, and your contribution visible. Then the world waits for tomorrow’s city.',
    details: ['The game remembers what happened.', 'Your subreddit returns together for one more dawn.'],
    durationMs: 10000,
  },
];

export const SHOWCASE_DURATION_MS = SHOWCASE_SCENES.reduce((total, scene) => total + scene.durationMs, 0);

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
