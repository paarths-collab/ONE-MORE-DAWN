import { describe, expect, it } from 'vitest';
import { SHOWCASE_SCENES, isRecordingShowcase } from './showcase';

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
    expect(SHOWCASE_SCENES.reduce((total, scene) => total + scene.durationMs, 0)).toBe(50_000);
  });
});
