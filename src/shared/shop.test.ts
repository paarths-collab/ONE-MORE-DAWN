import { describe, expect, it } from 'vitest';
import {
  economyOf,
  landExpansionState,
  normalizeEconomyFields,
  shopItem,
} from './shop';

describe('shop catalog and economy wire state', () => {
  it('keeps catalog prices server-owned and non-power-bearing', () => {
    expect(shopItem('hearth_lantern')).toMatchObject({
      id: 'hearth_lantern',
      slot: 'light',
      price: 3,
    });
    expect(shopItem('not_real')).toBeUndefined();
  });

  it('preserves valid inventory while dropping unknown, duplicate, and wrong-slot data', () => {
    const normalized = normalizeEconomyFields({
      coins: 20,
      coinsEarnedToday: 2,
      coinsEarnedCycle: 3,
      coinsEarnedDay: 7,
      ownedCosmetics: [
        'hearth_lantern',
        'hearth_lantern',
        'slate_roof',
      ],
      equippedCosmetics: {
        light: 'hearth_lantern',
        banner: 'slate_roof',
        roof: 'slate_roof',
      },
    });
    expect(normalized).toEqual({
      coins: 20,
      coinsEarnedToday: 2,
      coinsEarnedCycle: 3,
      coinsEarnedDay: 7,
      ownedCosmetics: ['hearth_lantern', 'slate_roof'],
      equippedCosmetics: { light: 'hearth_lantern', roof: 'slate_roof' },
    });
  });

  it('reports a stale day or cycle counter as zero without erasing the balance', () => {
    const stored = {
      coins: 9,
      coinsEarnedToday: 5,
      coinsEarnedCycle: 2,
      coinsEarnedDay: 1,
      ownedCosmetics: [],
      equippedCosmetics: {},
    };
    expect(economyOf(stored, 2, 2)).toMatchObject({ coins: 9, earnedToday: 0 });
    expect(economyOf(stored, 3, 1)).toMatchObject({ coins: 9, earnedToday: 0 });
    expect(economyOf(stored, 2, 1)).toMatchObject({ coins: 9, earnedToday: 5 });
  });

  it('unlocks only one connected land district at a time', () => {
    const empty = landExpansionState({});
    expect(empty.activeProjectId).toBe('outer_fields');
    expect(empty.unlocked).toEqual([]);
    expect(empty.projects.map((project) => project.available)).toEqual([true, false, false]);

    const fields = landExpansionState({ outer_fields: 120, river_ward: 40 });
    expect(fields.activeProjectId).toBe('river_ward');
    expect(fields.unlocked).toEqual(['outer_fields']);
    expect(fields.projects[1]).toMatchObject({ funded: 40, remaining: 220, available: true });

    const all = landExpansionState({
      outer_fields: 999,
      river_ward: 260,
      high_keep: 450,
    });
    expect(all.activeProjectId).toBeNull();
    expect(all.unlocked).toEqual(['outer_fields', 'river_ward', 'high_keep']);
    expect(all.projects.map((project) => project.funded)).toEqual([120, 260, 450]);
  });
});
