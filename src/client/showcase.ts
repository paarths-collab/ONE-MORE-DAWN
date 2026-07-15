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
  durationMs: number;
};

export const SHOWCASE_SCENES: ShowcaseScene[] = [
  {
    id: 'camp',
    eyebrow: '01 · THE FIRST FIRE',
    title: 'Every subreddit begins with a camp.',
    line: 'One shared city. Nothing survives unless the community builds it together.',
    durationMs: 4000,
  },
  {
    id: 'growth',
    eyebrow: '02 · THE CITY RISES',
    title: 'Every contribution leaves a mark.',
    line: 'Labor raises civic buildings. Every contributor earns one permanent house.',
    durationMs: 7000,
  },
  {
    id: 'shield',
    eyebrow: '03 · PREPARE FOR DAWN',
    title: 'Daily play charges the city shield.',
    line: 'Missions and puzzles add shield points across six defensive segments.',
    durationMs: 5000,
  },
  {
    id: 'raid',
    eyebrow: '04 · RAID AT THE GATE',
    title: 'At dawn, preparation is tested.',
    line: 'Strong panels stop fireballs. Weak panels let the attack reach the streets below.',
    durationMs: 10000,
  },
  {
    id: 'aftermath',
    eyebrow: '05 · CONSEQUENCES',
    title: 'The city remembers what was lost.',
    line: 'A pierced shield costs lives, damages homes, and creates a shared rebuild queue.',
    durationMs: 5000,
  },
  {
    id: 'rebuild',
    eyebrow: '06 · NO CITIZEN REBUILDS ALONE',
    title: 'The community restores every home.',
    line: 'The next labor repairs a neighbor’s house without erasing who built it.',
    durationMs: 5000,
  },
  {
    id: 'puzzle',
    eyebrow: '07 · RECONNECT THE CITY',
    title: 'A new puzzle arrives every day.',
    line: 'Restore the circuit, earn standing, and recharge the weakest shield segment.',
    durationMs: 7000,
  },
  {
    id: 'dawn',
    eyebrow: '08 · ONE MORE DAWN',
    title: 'The consequences persist. The city returns.',
    line: 'Read the Dawn Report, see your impact, and prepare together for tomorrow.',
    durationMs: 7000,
  },
];

export const isRecordingShowcase = (host: string, search: string): boolean => {
  const local = host === 'localhost' || host === '127.0.0.1';
  return local && new URLSearchParams(search).get('showcase') === '1';
};
