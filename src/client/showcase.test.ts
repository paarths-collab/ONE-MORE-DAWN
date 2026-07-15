import { describe, expect, it } from 'vitest';
import { evaluate, initialRotations, rotateTile } from '../shared/puzzle';
import { PUZZLE_LEVELS } from '../shared/puzzleLevels';
import { SHOWCASE_DURATION_MS, SHOWCASE_SCENES, isRecordingShowcase, showcasePuzzleTapPlan } from './showcase';

describe('recording showcase gate', () => {
  it('only enables from an explicit localhost query', () => {
    expect(isRecordingShowcase('localhost', '?showcase=1')).toBe(true);
    expect(isRecordingShowcase('127.0.0.1', '?showcase=1')).toBe(true);
    expect(isRecordingShowcase('localhost', '')).toBe(false);
    expect(isRecordingShowcase('www.reddit.com', '?showcase=1')).toBe(false);
  });

  it('tells the complete growth to dawn story in order', () => {
    expect(SHOWCASE_SCENES.map((scene) => scene.id)).toEqual([
      'camp', 'growth', 'shield', 'raid', 'aftermath', 'rebuild', 'puzzle', 'dawn',
    ]);
    expect(SHOWCASE_DURATION_MS).toBe(85_000);
  });

  it('uses a valid tap sequence for the real puzzle board', () => {
    for (const level of PUZZLE_LEVELS) {
      let rotations = initialRotations(level);
      for (const tileIndex of showcasePuzzleTapPlan(level)) rotations = rotateTile(level, rotations, tileIndex);
      expect(evaluate(level, rotations).solved).toBe(true);
    }
  });
});
