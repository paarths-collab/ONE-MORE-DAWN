import { describe, expect, it } from 'vitest';
import { KEYS } from '../storage/redisKeys';
import { makeFakeRedis } from '../storage/store.test';
import { beginUserLock } from './userLock';

/**
 * Proves the per-user optimistic lock against a fake Redis that models real
 * WATCH/MULTI/EXEC semantics (see makeFakeRedis). The whole point of the change:
 * two DIFFERENT users writing at the same instant must NOT conflict (the old
 * watch(players) made them collide and 409); a genuine SAME-user double-tap
 * MUST conflict (that is the race we want to reject).
 *
 * Concurrency is simulated by interleaving by hand: both requests begin (watch)
 * before either commits, exactly as two racing serverless invocations would.
 */

const hSetPlayer = (userId: string, tag: string) => async (tx: {
  hSet(key: string, fv: Record<string, string>): Promise<unknown>;
}) => {
  await tx.hSet(KEYS.players, { [userId]: tag });
};

describe('beginUserLock', () => {
  it('commits a single uncontested write and bumps the user lock', async () => {
    const redis = makeFakeRedis();
    const lock = await beginUserLock(redis, 't2_solo');
    const ok = await lock.commit(hSetPlayer('t2_solo', 'x'));
    expect(ok).toBe(true);
    expect(await redis.hGet(KEYS.players, 't2_solo')).toBe('x');
    expect(await redis.get(KEYS.playerLock('t2_solo'))).toBe('1'); // lock incremented in-tx
  });

  it('SAME user, two concurrent commits → first wins, second conflicts (409 case)', async () => {
    const redis = makeFakeRedis();
    // both requests begin before either commits (they race)
    const a = await beginUserLock(redis, 't2_dup');
    const b = await beginUserLock(redis, 't2_dup');

    const aOk = await a.commit(hSetPlayer('t2_dup', 'A'));
    const bOk = await b.commit(hSetPlayer('t2_dup', 'B'));

    expect(aOk).toBe(true); // first to exec commits
    expect(bOk).toBe(false); // watched lock changed under B → aborted, not lost-update
    expect(await redis.hGet(KEYS.players, 't2_dup')).toBe('A'); // B never wrote
  });

  it('DIFFERENT users, two concurrent commits → BOTH succeed (the bug this fixes)', async () => {
    const redis = makeFakeRedis();
    const a = await beginUserLock(redis, 't2_alice');
    const b = await beginUserLock(redis, 't2_bob');

    // both write into the shared `players` hash at the same time...
    const aOk = await a.commit(hSetPlayer('t2_alice', 'A'));
    const bOk = await b.commit(hSetPlayer('t2_bob', 'B'));

    // ...and neither aborts, because they watch different per-user lock keys.
    expect(aOk).toBe(true);
    expect(bOk).toBe(true);
    expect(await redis.hGet(KEYS.players, 't2_alice')).toBe('A');
    expect(await redis.hGet(KEYS.players, 't2_bob')).toBe('B');
  });

  it('serializes different users when they fund the same shared project', async () => {
    const redis = makeFakeRedis();
    const projectLock = KEYS.landProjectLock('outer_fields');
    const alice = await beginUserLock(redis, 't2_alice', [projectLock]);
    const bob = await beginUserLock(redis, 't2_bob', [projectLock]);

    expect(await alice.commit(hSetPlayer('t2_alice', 'A'))).toBe(true);
    expect(await bob.commit(hSetPlayer('t2_bob', 'B'))).toBe(false);
    expect(await redis.get(projectLock)).toBe('1');
    expect(await redis.hGet(KEYS.players, 't2_bob')).toBeUndefined();
  });

  it('abort() releases the watch without writing, so a later same-user commit is uncontested', async () => {
    const redis = makeFakeRedis();
    const a = await beginUserLock(redis, 't2_ab');
    await a.abort(); // validation failed → release, no bump

    const b = await beginUserLock(redis, 't2_ab');
    const bOk = await b.commit(hSetPlayer('t2_ab', 'B'));
    expect(bOk).toBe(true); // A left no trace, B commits cleanly
    expect(await redis.hGet(KEYS.players, 't2_ab')).toBe('B');
  });

  it('sequential same-user commits both succeed (no false conflict when not racing)', async () => {
    const redis = makeFakeRedis();
    const first = await beginUserLock(redis, 't2_seq');
    expect(await first.commit(hSetPlayer('t2_seq', '1'))).toBe(true);
    // a fresh begin AFTER the first fully committed sees the new version → fine
    const second = await beginUserLock(redis, 't2_seq');
    expect(await second.commit(hSetPlayer('t2_seq', '2'))).toBe(true);
    expect(await redis.get(KEYS.playerLock('t2_seq'))).toBe('2'); // bumped twice
  });
});
