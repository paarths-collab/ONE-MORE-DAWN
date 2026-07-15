import { describe, expect, it } from 'vitest';
import { evaluate, initialRotations, rotateTile } from '../shared/puzzle';
import { PUZZLE_LEVELS } from '../shared/puzzleLevels';
import {
  SHOWCASE_DURATION_MS,
  SHOWCASE_SCENES,
  isRecordingShowcase,
  showcaseAutoplayFromSearch,
  showcasePuzzleTapPlan,
  showcaseSceneFromSearch,
} from './showcase';

describe('recording showcase gate', () => {
  it('only enables from an explicit localhost query', () => {
    expect(isRecordingShowcase('localhost', '?showcase=1')).toBe(true);
    expect(isRecordingShowcase('127.0.0.1', '?showcase=1')).toBe(true);
    expect(isRecordingShowcase('localhost', '')).toBe(false);
    expect(isRecordingShowcase('www.reddit.com', '?showcase=1')).toBe(false);
  });

  it('tells the complete camp-to-dawn story in order', () => {
    expect(SHOWCASE_SCENES.map((scene) => scene.id)).toEqual([
      'opening', 'camp', 'roles', 'contribute', 'growth', 'decide', 'warning', 'raid', 'rebuild', 'puzzle', 'dawn', 'end',
    ]);
    expect(SHOWCASE_DURATION_MS).toBe(88_000);
  });

  it('opens a clean Camp capture by default and accepts only known scene keys', () => {
    expect(showcaseSceneFromSearch('?showcase=1')).toBe('camp');
    expect(showcaseSceneFromSearch('?showcase=1&scene=raid')).toBe('raid');
    expect(showcaseSceneFromSearch('?showcase=1&scene=made-up')).toBe('camp');
    expect(showcaseAutoplayFromSearch('?showcase=1')).toBe(false);
    expect(showcaseAutoplayFromSearch('?showcase=1&autoplay=1')).toBe(true);
  });

  it('uses a valid tap sequence for the real puzzle board', () => {
    for (const level of PUZZLE_LEVELS) {
      let rotations = initialRotations(level);
      for (const tileIndex of showcasePuzzleTapPlan(level)) rotations = rotateTile(level, rotations, tileIndex);
      expect(evaluate(level, rotations).solved).toBe(true);
    }
  });
});
