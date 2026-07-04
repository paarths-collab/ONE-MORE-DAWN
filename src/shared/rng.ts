/** Mulberry32 — tiny, fast, deterministic. Do not change: seeds are contracts. */
export type Rng = {
  next(): number; // [0, 1)
  int(maxExclusive: number): number;
  pick<K extends string>(weights: Record<K, number>): K;
  shuffle<T>(items: T[]): T[]; // returns a new array
};

export const makeRng = (seed: number): Rng => {
  let a = seed >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (maxExclusive: number) => Math.floor(next() * maxExclusive),
    pick: <K extends string>(weights: Record<K, number>): K => {
      const entries = Object.entries(weights) as [K, number][];
      const total = entries.reduce((s, [, w]) => s + w, 0);
      let roll = next() * total;
      for (const [key, weight] of entries) {
        roll -= weight;
        if (roll <= 0) return key;
      }
      return entries[entries.length - 1]![0];
    },
    shuffle: <T>(items: T[]): T[] => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
  };
};

/** FNV-1a 32-bit. Used for lootSeed = hashString(`${layoutSeed}-${userId}`). */
export const hashString = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};
