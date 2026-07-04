import { describe, expect, it } from 'vitest';
import { generateMap, rollCrateContents, reachableTiles } from './mapgen';
import { BALANCE } from './balance';

describe('generateMap', () => {
  it('is deterministic: same seed, same map', () => {
    expect(generateMap(4242, 30)).toEqual(generateMap(4242, 30));
  });

  it('differs across seeds', () => {
    expect(JSON.stringify(generateMap(1, 30))).not.toBe(JSON.stringify(generateMap(2, 30)));
  });

  it('every map is solvable: spawn, exit, and all crates are mutually reachable', () => {
    for (let seed = 0; seed < 50; seed++) {
      const map = generateMap(seed, 30);
      const reachable = reachableTiles(map, map.spawn);
      expect(reachable.has(`${map.exit.x},${map.exit.y}`)).toBe(true);
      for (const crate of map.crates) {
        expect(reachable.has(`${crate.x},${crate.y}`)).toBe(true);
      }
    }
  });

  it('places the configured number of crates with unique positions and ids', () => {
    const map = generateMap(7, 30);
    expect(map.crates).toHaveLength(BALANCE.mission.cratesPerMap);
    const positions = new Set(map.crates.map((c) => `${c.x},${c.y}`));
    expect(positions.size).toBe(map.crates.length);
    const ids = new Set(map.crates.map((c) => c.id));
    expect(ids.size).toBe(map.crates.length);
  });

  it('hazard count scales with threat', () => {
    const calm = generateMap(7, 0);
    const dangerous = generateMap(7, 100);
    expect(dangerous.hazards.length).toBeGreaterThan(calm.hazards.length);
  });

  it('hazards never sit on spawn, exit, or crates', () => {
    for (let seed = 0; seed < 20; seed++) {
      const map = generateMap(seed, 80);
      const forbidden = new Set([
        `${map.spawn.x},${map.spawn.y}`,
        `${map.exit.x},${map.exit.y}`,
        ...map.crates.map((c) => `${c.x},${c.y}`),
      ]);
      for (const h of map.hazards) {
        expect(forbidden.has(`${h.x},${h.y}`)).toBe(false);
      }
    }
  });

  it('crates carry BFS depth from exit; some are deep', () => {
    const map = generateMap(11, 30);
    expect(map.crates.some((c) => c.depth >= BALANCE.mission.deepCrateDepthThreshold)).toBe(true);
    expect(map.crates.some((c) => c.depth < BALANCE.mission.deepCrateDepthThreshold)).toBe(true);
  });
});

describe('rollCrateContents', () => {
  it('is deterministic per lootSeed', () => {
    const map = generateMap(11, 30);
    expect(rollCrateContents(map, 999)).toEqual(rollCrateContents(map, 999));
  });

  it('differs across lootSeeds (personalized loot, shared layout)', () => {
    const map = generateMap(11, 30);
    expect(JSON.stringify(rollCrateContents(map, 1))).not.toBe(
      JSON.stringify(rollCrateContents(map, 2)),
    );
  });

  it('near crates hold 1 item; deep crates hold 2-3', () => {
    const map = generateMap(11, 30);
    const contents = rollCrateContents(map, 55);
    for (const c of contents) {
      const crate = map.crates.find((k) => k.id === c.crateId)!;
      const items = Object.values(c.loot).reduce((s, n) => s + (n ?? 0), 0);
      if (crate.depth >= BALANCE.mission.deepCrateDepthThreshold) {
        expect(items).toBeGreaterThanOrEqual(BALANCE.mission.deepCrate.minItems);
        expect(items).toBeLessThanOrEqual(BALANCE.mission.deepCrate.maxItems);
      } else {
        expect(items).toBe(BALANCE.mission.nearCrate.items);
      }
    }
  });
});
