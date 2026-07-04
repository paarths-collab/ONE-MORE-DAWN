import { describe, expect, it } from 'vitest';
import { Store } from '../storage/store';
import { makeFakeRedis } from '../storage/store.test';
import { runLazyResolution, utcDateString } from './lazyResolve';
import { newCityState } from './resolver';

describe('utcDateString', () => {
  it('formats a UTC calendar date', () => {
    expect(utcDateString(new Date('2026-07-04T23:59:00Z'))).toBe('2026-07-04');
    expect(utcDateString(new Date('2026-07-05T00:01:00Z'))).toBe('2026-07-05');
  });
});

describe('runLazyResolution', () => {
  it('creates the city on first ever call', async () => {
    const redis = makeFakeRedis();
    const store = new Store(redis);
    const { city } = await runLazyResolution(store, redis, new Date('2026-07-04T10:00:00Z'));
    expect(city.day).toBe(1);
    expect((await store.getCityMeta()).lastResolvedDate).toBe('2026-07-04');
  });

  it('does not resolve twice on the same UTC date', async () => {
    const redis = makeFakeRedis();
    const store = new Store(redis);
    await runLazyResolution(store, redis, new Date('2026-07-04T10:00:00Z'));
    const { city } = await runLazyResolution(store, redis, new Date('2026-07-04T22:00:00Z'));
    expect(city.day).toBe(1);
  });

  it('resolves exactly one day when the date rolls over', async () => {
    const redis = makeFakeRedis();
    const store = new Store(redis);
    await runLazyResolution(store, redis, new Date('2026-07-04T10:00:00Z'));
    const { city } = await runLazyResolution(store, redis, new Date('2026-07-06T09:00:00Z'));
    expect(city.day).toBe(2); // forgiving: multiple missed dates = one resolution
    expect((await store.getCityMeta()).lastResolvedDate).toBe('2026-07-06');
    const timeline = await store.getTimeline(5);
    expect(timeline).toHaveLength(1);
    expect(timeline[0]!.day).toBe(1);
  });

  it('returns resolving=true without resolving when the lock is held', async () => {
    const redis = makeFakeRedis();
    const store = new Store(redis);
    await runLazyResolution(store, redis, new Date('2026-07-04T10:00:00Z'));
    await redis.set('resolver:lock', 'held', { nx: true });
    const { city, resolving } = await runLazyResolution(store, redis, new Date('2026-07-05T10:00:00Z'));
    expect(resolving).toBe(true);
    expect(city.day).toBe(1); // untouched
  });

  it('does not advance a fallen city', async () => {
    const redis = makeFakeRedis();
    const store = new Store(redis);
    await runLazyResolution(store, redis, new Date('2026-07-04T10:00:00Z'));
    const fallen = { ...newCityState(1), status: 'fallen' as const };
    await store.setCityState(fallen);
    const { city } = await runLazyResolution(store, redis, new Date('2026-07-05T10:00:00Z'));
    expect(city.status).toBe('fallen');
    expect(city.day).toBe(1);
  });
});
