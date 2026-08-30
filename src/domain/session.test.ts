import { describe, expect, it } from 'vitest';
import {
  bestShots,
  compareShotSets,
  demoSession,
  findSimilarShots,
} from './session';

describe('replay analysis', () => {
  it('finds the intentionally similar off-balance backhands', () => {
    const matches = findSimilarShots(demoSession, 'shot-03', 3);
    expect(matches.map((shot) => shot.id)).toEqual(['shot-08', 'shot-11', 'shot-04']);
  });

  it('shows recovery as a large gap between problem and reference backhands', () => {
    const comparison = compareShotSets(
      demoSession,
      ['shot-03', 'shot-08', 'shot-11'],
      ['shot-01', 'shot-06', 'shot-09'],
    );
    const recovery = comparison.metrics.find((row) => row.metric === 'recovery');
    expect(recovery?.delta).toBeGreaterThan(0.4);
  });

  it('ranks the strong backhand references first', () => {
    expect(bestShots(demoSession, 'backhand', 3).map((shot) => shot.id)).toEqual([
      'shot-06',
      'shot-01',
      'shot-09',
    ]);
  });
});
