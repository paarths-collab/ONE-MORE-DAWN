import { BALANCE } from '../../shared/balance';
import { generateMap, rollCrateContents } from '../../shared/mapgen';
import type { LootKind, MissionCompleteRequest, Role } from '../../shared/types';

export type MissionToken = {
  tokenId: string;
  userId: string;
  day: number;
  layoutSeed: number;
  lootSeed: number;
  roleAtStart: Role | null;
  startedAtServerMs: number;
  expiresAtServerMs: number;
  consumed: boolean;
};

export type MissionEvaluation =
  | { ok: true; banked: Partial<Record<LootKind, number>>; injured: boolean }
  | { ok: false; reason: string };

/**
 * Spec §4 anti-cheat: the client sends crate IDs; the server regenerates the
 * map from layoutSeed, prices crates from lootSeed, and calculates loot
 * itself. Pure — the route supplies token, request, identity, and clock.
 */
export const evaluateMission = (
  token: MissionToken,
  request: MissionCompleteRequest,
  userId: string,
  cityDay: number,
  cityThreat: number,
  nowMs: number,
): MissionEvaluation => {
  if (token.consumed) return { ok: false, reason: 'Mission already submitted.' };
  if (token.userId !== userId) return { ok: false, reason: 'Not your mission.' };
  if (token.day !== cityDay) return { ok: false, reason: 'This mission belongs to a day that has passed.' };
  if (nowMs > token.expiresAtServerMs) return { ok: false, reason: 'Mission expired.' };

  const serverDuration = nowMs - token.startedAtServerMs;
  if (serverDuration < BALANCE.mission.minPlausibleDurationMs) {
    return { ok: false, reason: 'Implausible completion time.' };
  }
  const airMs =
    (BALANCE.mission.airSeconds +
      (token.roleAtStart === 'scout' ? BALANCE.mission.scoutAirBonusSeconds : 0)) *
    1000;
  if (serverDuration > airMs + BALANCE.mission.completionGraceMs) {
    return { ok: false, reason: 'Mission took too long.' };
  }

  const unique = new Set(request.collectedCrateIds);
  if (unique.size !== request.collectedCrateIds.length) {
    return { ok: false, reason: 'Duplicate crates claimed.' };
  }

  const map = generateMap(token.layoutSeed, cityThreat);
  const valid = new Set(map.crates.map((c) => c.id));
  for (const id of request.collectedCrateIds) {
    if (!valid.has(id)) return { ok: false, reason: `Unknown crate: ${id}` };
  }

  const contents = rollCrateContents(map, token.lootSeed);
  const banked: Partial<Record<LootKind, number>> = {};
  let totalItems = 0;
  for (const c of contents) {
    if (!unique.has(c.crateId)) continue;
    for (const [kind, n] of Object.entries(c.loot) as [LootKind, number][]) {
      banked[kind] = (banked[kind] ?? 0) + n;
      totalItems += n;
    }
  }

  const failed = request.status !== 'escaped';
  if (failed) {
    // keep half, rounded down, distributed by trimming items one kind at a time
    let keep = Math.floor(totalItems * BALANCE.mission.failLootKeepRatio);
    const trimmed: Partial<Record<LootKind, number>> = {};
    for (const [kind, n] of Object.entries(banked) as [LootKind, number][]) {
      const take = Math.min(n, keep);
      if (take > 0) trimmed[kind] = take;
      keep -= take;
    }
    return { ok: true, banked: trimmed, injured: true };
  }

  return { ok: true, banked, injured: false };
};
