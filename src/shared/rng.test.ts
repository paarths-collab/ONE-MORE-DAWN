import { describe, expect, it } from 'vitest';
import { deriveLayoutSeed, hashString, makeRng } from './rng';

describe('makeRng', () => {
  it('is deterministic for the same seed', () => {
    const a = makeRng(12345);
    const b = makeRng(12345);
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];
    expect(seqA).toEqual(seqB);
  });

  it('differs across seeds', () => {
    expect(makeRng(1).next()).not.toBe(makeRng(2).next());
  });

  it('next() is in [0,1); int(n) is in [0,n)', () => {
    const rng = makeRng(99);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const n = rng.int(7);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(7);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it('pick() chooses weighted keys deterministically', () => {
    const rng = makeRng(5);
    const picks = new Set<string>();
    for (let i = 0; i < 200; i++) picks.add(rng.pick({ a: 0.5, b: 0.5 }));
    expect(picks).toEqual(new Set(['a', 'b']));
  });
});

describe('hashString', () => {
  it('is deterministic and spreads across inputs', () => {
    expect(hashString('42-t2_abc')).toBe(hashString('42-t2_abc'));
    expect(hashString('42-t2_abc')).not.toBe(hashString('42-t2_abd'));
    expect(Number.isInteger(hashString('anything'))).toBe(true);
  });
});

describe('deriveLayoutSeed (W1)', () => {
  it('is deterministic for the same (worldSeed, cycle, day)', () => {
    expect(deriveLayoutSeed(123, 1, 5)).toBe(deriveLayoutSeed(123, 1, 5));
  });

  it('differs across worldSeeds on the same (cycle, day)', () => {
    // The core W1 fix: two installations never share a map layout.
    expect(deriveLayoutSeed(111111, 1, 1)).not.toBe(deriveLayoutSeed(222222, 1, 1));
    expect(deriveLayoutSeed(0, 1, 1)).not.toBe(deriveLayoutSeed(1, 1, 1));
  });

  it('differs across days and cycles within one world', () => {
    expect(deriveLayoutSeed(123, 1, 1)).not.toBe(deriveLayoutSeed(123, 1, 2));
    expect(deriveLayoutSeed(123, 1, 1)).not.toBe(deriveLayoutSeed(123, 2, 1));
  });
});
