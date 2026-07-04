import { describe, expect, it } from 'vitest';
import { evaluateMission, type MissionToken } from './missionRules';
import { generateMap, rollCrateContents } from '../../shared/mapgen';
import { BALANCE } from '../../shared/balance';

const NOW = 1_800_000_000_000;

const token: MissionToken = {
  tokenId: 'tok1',
  userId: 't2_a',
  day: 5,
  layoutSeed: 4242,
  lootSeed: 999,
  roleAtStart: 'scout',
  startedAtServerMs: NOW - 60_000,
  expiresAtServerMs: NOW + 540_000,
  consumed: false,
};

const map = generateMap(token.layoutSeed, 30);
const contents = rollCrateContents(map, token.lootSeed);
const validCrates = map.crates.slice(0, 2).map((c) => c.id);

const request = {
  tokenId: 'tok1',
  status: 'escaped' as const,
  collectedCrateIds: validCrates,
  clientDurationMs: 60_000,
};

describe('evaluateMission', () => {
  it('banks full server-calculated loot on escape', () => {
    const result = evaluateMission(token, request, 't2_a', 5, 30, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const expected: Record<string, number> = {};
    for (const c of contents.filter((c) => validCrates.includes(c.crateId))) {
      for (const [kind, n] of Object.entries(c.loot)) {
        expected[kind] = (expected[kind] ?? 0) + (n ?? 0);
      }
    }
    expect(result.banked).toEqual(expected);
    expect(result.injured).toBe(false);
  });

  it('halves loot (rounded down) and injures on timeout or hazard', () => {
    for (const status of ['timeout', 'hazard'] as const) {
      const result = evaluateMission(token, { ...request, status }, 't2_a', 5, 30, NOW);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const fullItems = contents
        .filter((c) => validCrates.includes(c.crateId))
        .flatMap((c) => Object.values(c.loot))
        .reduce((s, n) => s + (n ?? 0), 0);
      const bankedItems = Object.values(result.banked).reduce((s, n) => s + (n ?? 0), 0);
      expect(bankedItems).toBe(Math.floor(fullItems * BALANCE.mission.failLootKeepRatio));
      expect(result.injured).toBe(true);
    }
  });

  it('rejects a consumed token', () => {
    const r = evaluateMission({ ...token, consumed: true }, request, 't2_a', 5, 30, NOW);
    expect(r).toEqual({ ok: false, reason: expect.stringMatching(/already/i) });
  });

  it('rejects the wrong user', () => {
    expect(evaluateMission(token, request, 't2_intruder', 5, 30, NOW).ok).toBe(false);
  });

  it('rejects a stale day', () => {
    expect(evaluateMission(token, request, 't2_a', 6, 30, NOW).ok).toBe(false);
  });

  it('rejects after expiry', () => {
    expect(evaluateMission(token, request, 't2_a', 5, 30, token.expiresAtServerMs + 1).ok).toBe(false);
  });

  it('rejects implausibly fast completion', () => {
    const fast = { ...token, startedAtServerMs: NOW - 1000 };
    expect(evaluateMission(fast, request, 't2_a', 5, 30, NOW).ok).toBe(false);
  });

  it('rejects crate ids that are not on the seeded map', () => {
    const r = evaluateMission(token, { ...request, collectedCrateIds: ['c999'] }, 't2_a', 5, 30, NOW);
    expect(r.ok).toBe(false);
  });

  it('rejects duplicate crate ids', () => {
    const dup = [validCrates[0]!, validCrates[0]!];
    expect(evaluateMission(token, { ...request, collectedCrateIds: dup }, 't2_a', 5, 30, NOW).ok).toBe(false);
  });
});
