import { describe, expect, it } from 'vitest';
import { readViewMode, withViewMode } from './viewMode';

describe('readViewMode', () => {
  it('defaults to player', () => {
    expect(readViewMode('')).toBe('player');
    expect(readViewMode('?session=abc')).toBe('player');
    expect(readViewMode('?mode=')).toBe('player');
    expect(readViewMode('?mode=wizard')).toBe('player');
  });

  it('reads ?mode= for every mode, case-insensitively', () => {
    expect(readViewMode('?mode=player')).toBe('player');
    expect(readViewMode('?mode=analysis')).toBe('analysis');
    expect(readViewMode('?mode=developer')).toBe('developer');
    expect(readViewMode('?session=x&mode=Analysis')).toBe('analysis');
  });

  it('treats ?debug=1 as developer, overriding mode', () => {
    expect(readViewMode('?debug=1')).toBe('developer');
    expect(readViewMode('?mode=player&debug=1')).toBe('developer');
    expect(readViewMode('?debug=0&mode=analysis')).toBe('analysis');
    expect(readViewMode('?debug=true')).toBe('player');
  });
});

describe('withViewMode', () => {
  it('sets mode and preserves other params', () => {
    expect(withViewMode('?session=tennisbot-20260706', 'analysis'))
      .toBe('?session=tennisbot-20260706&mode=analysis');
    expect(withViewMode('?mode=analysis&session=x', 'developer'))
      .toBe('?mode=developer&session=x');
  });

  it('removes mode for player and always drops debug', () => {
    expect(withViewMode('?session=x&mode=analysis', 'player')).toBe('?session=x');
    expect(withViewMode('?debug=1&session=x', 'player')).toBe('?session=x');
    expect(withViewMode('?debug=1', 'analysis')).toBe('?mode=analysis');
    expect(withViewMode('?debug=1&mode=developer', 'player')).toBe('');
    expect(withViewMode('', 'player')).toBe('');
  });

  it('round-trips through readViewMode', () => {
    for (const mode of ['player', 'analysis', 'developer'] as const) {
      expect(readViewMode(withViewMode('?session=x&debug=1', mode))).toBe(mode);
    }
  });
});
