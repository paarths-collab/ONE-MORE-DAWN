import { describe, expect, it } from 'vitest';
import { cityNameFromSeed } from './cityName';

describe('cityNameFromSeed', () => {
  it('is deterministic for the same seed', () => {
    expect(cityNameFromSeed(12345)).toBe(cityNameFromSeed(12345));
  });

  it('produces a non-empty uppercase name for any seed', () => {
    for (const seed of [0, 1, 42, -7, 2 ** 31 - 1, 123456789]) {
      const name = cityNameFromSeed(seed);
      expect(name.length).toBeGreaterThan(3);
      expect(name).toBe(name.toUpperCase());
    }
  });

  it('gives different subreddit seeds different names (spot check)', () => {
    expect(cityNameFromSeed(1)).not.toBe(cityNameFromSeed(2));
    expect(cityNameFromSeed(33)).not.toBe(cityNameFromSeed(66));
  });
});
