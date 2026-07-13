import { beforeEach, describe, expect, it, vi } from 'vitest';
import { context, redis, reddit } from '@devvit/web/server';
import type { ShopPurchaseResponse } from '../../shared/types';
import { SHOP_CATALOG } from '../../shared/shop';
import { api } from './api';
import { shop } from './shop';
import { KEYS } from '../storage/redisKeys';
import { Store } from '../storage/store';
import { makeFakeRedis, type FakeRedis } from '../storage/store.test';

/**
 * The shop must be server-authoritative end to end: catalog prices only,
 * stored balances only, whole-profile writes under the per-user lock, no
 * double-charge path. Same mocking strategy as api.routes.test.ts.
 */
vi.mock('@devvit/web/server', () => ({
  context: {
    userId: undefined as string | undefined,
    subredditId: 't5_test',
    subredditName: 'testsub',
    postId: 't3_post',
  },
  reddit: {
    getCurrentUser: vi.fn(),
    getCurrentSubreddit: vi.fn(),
    getCurrentUsername: vi.fn(),
    submitCustomPost: vi.fn(),
  },
  redis: {},
}));

const ctx = context as unknown as { userId: string | undefined };
const redditMock = reddit as unknown as { getCurrentUsername: ReturnType<typeof vi.fn> };

let fake: FakeRedis;
let store: Store;

const postJson = (body: unknown) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const LANTERN = SHOP_CATALOG.find((i) => i.id === 'hearth_lantern')!;

const openRichUser = async (userId: string, coins: number) => {
  ctx.userId = userId;
  redditMock.getCurrentUsername.mockResolvedValueOnce('spender');
  expect((await api.request('/init')).status).toBe(200);
  const player = (await store.getPlayer(userId))!;
  await store.savePlayer({ ...player, coins });
};

beforeEach(() => {
  vi.clearAllMocks();
  fake = makeFakeRedis();
  Object.assign(redis, fake);
  store = new Store(fake);
});

describe('POST /shop/purchase', () => {
  it('debits the exact catalog price once and records ownership', async () => {
    await openRichUser('t2_buyer', 10);
    const res = await shop.request('/purchase', postJson({ itemId: 'hearth_lantern' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as ShopPurchaseResponse;
    expect(body.economy.coins).toBe(10 - LANTERN.price);
    expect(body.economy.owned).toEqual(['hearth_lantern']);
    expect(body.message).toContain('Hearth Lantern purchased');
    const saved = await store.getPlayer('t2_buyer');
    expect(saved?.coins).toBe(10 - LANTERN.price);
    expect(saved?.ownedCosmetics).toEqual(['hearth_lantern']);
  });

  it('rejects a duplicate purchase without charging twice', async () => {
    await openRichUser('t2_dupe', 10);
    expect((await shop.request('/purchase', postJson({ itemId: 'hearth_lantern' }))).status).toBe(200);
    expect((await shop.request('/purchase', postJson({ itemId: 'hearth_lantern' }))).status).toBe(409);
    expect((await store.getPlayer('t2_dupe'))?.coins).toBe(10 - LANTERN.price);
  });

  it('rejects insufficient funds — balance can never go negative', async () => {
    await openRichUser('t2_broke', 2);
    const res = await shop.request('/purchase', postJson({ itemId: 'hearth_lantern' }));
    expect(res.status).toBe(400);
    expect((await store.getPlayer('t2_broke'))?.coins).toBe(2);
    expect((await store.getPlayer('t2_broke'))?.ownedCosmetics).toEqual([]);
  });

  it('rejects unknown items and ignores client-forged prices', async () => {
    await openRichUser('t2_forger', 10);
    expect((await shop.request('/purchase', postJson({ itemId: 'free_castle' }))).status).toBe(400);
    // a forged price field is simply ignored — the catalog decides
    const res = await shop.request('/purchase', postJson({ itemId: 'hearth_lantern', price: 0 }));
    expect(res.status).toBe(200);
    expect((await store.getPlayer('t2_forger'))?.coins).toBe(10 - LANTERN.price);
  });

  it('rejects unauthenticated and player-less calls', async () => {
    ctx.userId = undefined;
    expect((await shop.request('/purchase', postJson({ itemId: 'hearth_lantern' }))).status).toBe(401);
    ctx.userId = 't2_ghost';
    // city exists (another user inited) but this user never opened the game
    expect((await shop.request('/purchase', postJson({ itemId: 'hearth_lantern' }))).status).toBe(409);
  });

  it('one of two same-user concurrent purchases 409s — never a double charge', async () => {
    await openRichUser('t2_race', 20);
    const [a, b] = await Promise.all([
      shop.request('/purchase', postJson({ itemId: 'hearth_lantern' })),
      shop.request('/purchase', postJson({ itemId: 'crimson_banner' })),
    ]);
    const statuses = [a.status, b.status].sort();
    const saved = (await store.getPlayer('t2_race'))!;
    if (statuses.join() === '200,200') {
      // both landed sequentially — both debits must be exact
      expect(saved.coins).toBe(20 - LANTERN.price - 5);
      expect(saved.ownedCosmetics).toHaveLength(2);
    } else {
      // optimistic conflict: exactly one debit landed
      expect(statuses).toEqual([200, 409]);
      expect(saved.ownedCosmetics).toHaveLength(1);
      const spent = 20 - saved.coins!;
      expect([LANTERN.price, 5]).toContain(spent);
    }
  });
});

describe('POST /shop/equip', () => {
  it('equips an owned item into its slot', async () => {
    await openRichUser('t2_wearer', 10);
    expect((await shop.request('/purchase', postJson({ itemId: 'hearth_lantern' }))).status).toBe(200);
    const res = await shop.request('/equip', postJson({ itemId: 'hearth_lantern' }));
    expect(res.status).toBe(200);
    const saved = await store.getPlayer('t2_wearer');
    expect(saved?.equippedCosmetics).toEqual({ light: 'hearth_lantern' });
  });

  it('only owned items can be equipped', async () => {
    await openRichUser('t2_naked', 10);
    const res = await shop.request('/equip', postJson({ itemId: 'hearth_lantern' }));
    expect(res.status).toBe(400);
    expect((await store.getPlayer('t2_naked'))?.equippedCosmetics).toEqual({});
  });

  it('a same-slot purchase can replace the equipped item', async () => {
    await openRichUser('t2_roofer', 30);
    expect((await shop.request('/purchase', postJson({ itemId: 'slate_roof' }))).status).toBe(200);
    expect((await shop.request('/equip', postJson({ itemId: 'slate_roof' }))).status).toBe(200);
    expect((await shop.request('/purchase', postJson({ itemId: 'dawn_gold_trim' }))).status).toBe(200);
    expect((await shop.request('/equip', postJson({ itemId: 'dawn_gold_trim' }))).status).toBe(200);
    const saved = await store.getPlayer('t2_roofer');
    expect(saved?.equippedCosmetics).toEqual({ roof: 'dawn_gold_trim' });
    expect(saved?.ownedCosmetics).toEqual(['slate_roof', 'dawn_gold_trim']);
    expect(saved?.coins).toBe(30 - 8 - 12);
  });

  it('survives corrupt stored economy data without crashing', async () => {
    await openRichUser('t2_corrupt', 10);
    const player = (await store.getPlayer('t2_corrupt'))!;
    await fake.hSet(KEYS.players, {
      t2_corrupt: JSON.stringify({ ...player, ownedCosmetics: 'lol', equippedCosmetics: 7, coins: -3 }),
    });
    expect((await shop.request('/equip', postJson({ itemId: 'hearth_lantern' }))).status).toBe(400);
    const res = await shop.request('/purchase', postJson({ itemId: 'hearth_lantern' }));
    expect(res.status).toBe(400); // coins normalized to 0 — cannot afford
  });
});
