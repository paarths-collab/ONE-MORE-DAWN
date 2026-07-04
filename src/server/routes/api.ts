import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import { getCrisis } from '../../shared/crises';
import type { ApiError, InitResponse } from '../../shared/types';
import { effectiveEnergy, freshPlayer, resetPlayerForDay } from '../game/dayLogic';
import { runLazyResolution } from '../game/lazyResolve';
import { Store, type RedisLike } from '../storage/store';

export const api = new Hono();

/**
 * Structural adapter: the Devvit client's SetOptions.expiration is a Date and
 * its ZRangeOptions.by is required, while RedisLike speaks seconds / optional
 * `by`. Delegates 1:1 otherwise — no behavior of its own.
 */
export const redisLike: RedisLike = {
  get: (key) => redis.get(key),
  set: (key, value, options) =>
    redis.set(
      key,
      value,
      options && {
        nx: options.nx,
        expiration:
          options.expiration === undefined
            ? undefined
            : new Date(Date.now() + options.expiration * 1000),
      },
    ),
  del: (...keys) => redis.del(...keys),
  expire: (key, seconds) => redis.expire(key, seconds),
  hGet: (key, field) => redis.hGet(key, field),
  hSet: (key, fieldValues) => redis.hSet(key, fieldValues),
  hGetAll: (key) => redis.hGetAll(key),
  hIncrBy: (key, field, value) => redis.hIncrBy(key, field, value),
  hDel: async (key, fields) => {
    await redis.hDel(key, fields);
  },
  zIncrBy: (key, member, value) => redis.zIncrBy(key, member, value),
  zAdd: (key, ...members) => redis.zAdd(key, ...members),
  zRange: (key, start, stop, options) =>
    redis.zRange(
      key,
      start,
      stop,
      options && { by: options.by ?? 'rank', reverse: options.reverse },
    ),
};

export const getStore = () => new Store(redisLike);

export const requireUser = (): { userId: string } | undefined => {
  const { userId } = context;
  return userId ? { userId } : undefined;
};

api.get('/init', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ApiError>({ status: 'error', message: 'postId missing from context' }, 400);
  }
  const user = requireUser();
  if (!user) {
    return c.json<ApiError>({ status: 'error', message: 'Log in to Reddit to play' }, 401);
  }

  const store = getStore();
  const { city, resolving } = await runLazyResolution(store, redisLike, new Date());

  const username = (await reddit.getCurrentUsername()) ?? 'citizen';
  let player = (await store.getPlayer(user.userId)) ?? freshPlayer(user.userId, username, city.day);
  const reset = resetPlayerForDay(player, city.day);
  if (reset !== player) {
    player = reset;
    await store.savePlayer(player);
  }

  const [crisisVotes, yourCrisisVote, strategyVotes, yourStrategyVote, yourActionsToday, timeline] =
    await Promise.all([
      store.getVoteTally(city.day),
      store.getVoterChoice(city.day, user.userId),
      store.getStrategyTally(city.day),
      store.getStrategyChoice(city.day, user.userId),
      store.getUserActions(city.day, user.userId),
      store.getTimeline(1),
    ]);

  return c.json<InitResponse>({
    type: 'init',
    postId,
    city,
    player,
    effectiveEnergy: effectiveEnergy(player, city.day),
    crisis: getCrisis(city.crisisId),
    crisisVotes,
    yourCrisisVote: yourCrisisVote ?? null,
    strategyVotes,
    yourStrategyVote: yourStrategyVote ?? null,
    yourActionsToday,
    missionUsedToday: (yourActionsToday as Record<string, unknown>)['mission'] !== undefined,
    resolving,
    timelinePreview: timeline[0] ?? null,
  });
});
