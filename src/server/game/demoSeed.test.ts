import { describe, expect, it } from 'vitest';
import { Store } from '../storage/store';
import { makeFakeRedis } from '../storage/store.test';
import { DEMO_CITIZENS, DEMO_DAY, seedDemoCity } from './demoSeed';

const seed = async () => {
  const store = new Store(makeFakeRedis());
  await seedDemoCity(store, { cycle: 2, worldSeed: 123, nowMs: 1_700_000_000_000 });
  return store;
};

describe('seedDemoCity', () => {
  it('creates a Day-5 city one tick from a raid', async () => {
    const store = await seed();
    const city = await store.getCityState();
    expect(city?.day).toBe(DEMO_DAY);
    expect(city?.status).toBe('alive');
    expect(city?.cycle).toBe(2);
    expect(city?.worldSeed).toBe(123);
    // threat 94, +6/day passive rise ⇒ raid lands tomorrow.
    expect(city!.threat).toBeGreaterThanOrEqual(94);
    expect(Math.ceil((100 - city!.threat) / 6)).toBe(1);
  });

  it('populates citizens with avatars, online-today count matches the roster', async () => {
    const store = await seed();
    const players = await store.getAllPlayers();
    expect(players).toHaveLength(DEMO_CITIZENS.length);
    expect(players.every((p) => p.avatar !== null && p.role !== null)).toBe(true);
    const online = players.filter((p) => p.lastActiveDay === DEMO_DAY).length;
    expect(online).toBe(DEMO_CITIZENS.filter((d) => d.active).length);
  });

  it('puts the Marked mid-rescue (6 pledges × 5 resolve = 30) with a saved-yesterday', async () => {
    const store = await seed();
    expect(await store.getMarkedPledge(DEMO_DAY)).toBe(30);
    const pledgers = await store.getPledgers(DEMO_DAY);
    expect(Object.keys(pledgers)).toHaveLength(6);
    expect(await store.getMarkedOutcome(DEMO_DAY - 1)).toEqual({ name: 'The North Wall', saved: true });
  });

  it('records crisis votes and council backing (prepare_raid leads)', async () => {
    const store = await seed();
    const crisis = await store.getVoteTally(DEMO_DAY);
    expect(crisis.a).toBe(4);
    expect(crisis.b).toBe(2);
    expect(crisis.c).toBe(3);
    const plans = await store.getStrategyTally(DEMO_DAY);
    const leader = Object.entries(plans).sort((a, b) => b[1] - a[1])[0]![0];
    expect(leader).toBe('prepare_raid');
  });

  it('scales the Marked goal via yesterday action-takers, and lays a 3-day chronicle', async () => {
    const store = await seed();
    // 7 active citizens acted yesterday (day 4).
    const y = await store.getAllUserActions(DEMO_DAY - 1);
    expect(Object.keys(y)).toHaveLength(DEMO_CITIZENS.filter((d) => d.active).length);
    const timeline = await store.getTimeline(10);
    expect(timeline.map((e) => e.day).sort()).toEqual([2, 3, 4]);
  });

  it('leaves faction influence standings with wardens ahead', async () => {
    const store = await seed();
    const inf = await store.getFactionInfluence(DEMO_DAY);
    const leader = Object.entries(inf).sort((a, b) => b[1] - a[1])[0]![0];
    expect(leader).toBe('wardens');
  });
});
