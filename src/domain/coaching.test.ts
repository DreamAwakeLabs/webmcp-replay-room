import { describe, expect, it } from 'vitest';
import {
  biggestDifference,
  coachMessage,
  describeShot,
  DRILLS,
  explainDifference,
  formatShotTime,
  isProblemOutcome,
  METRIC_HELP,
  METRIC_LABELS,
  OUTCOME_LABELS,
  scoreOf,
  STROKE_LABELS,
  strokePlural,
} from './coaching';
import {
  compareShotSets,
  demoSession,
  getShot,
  METRIC_NAMES,
  type Shot,
} from './session';

function shotWith(overrides: Partial<Shot>): Shot {
  return {
    ...getShot(demoSession, 'shot-03'),
    ...overrides,
  };
}

describe('labels', () => {
  it('names every metric with a player-facing label and help sentence', () => {
    expect(METRIC_LABELS).toEqual({
      balance: 'Balance through contact',
      spacing: 'Distance from the ball',
      recovery: 'Recovery after contact',
      rotation: 'Shoulder & hip rotation',
    });
    for (const metric of METRIC_NAMES) {
      expect(METRIC_HELP[metric]).toMatch(/^[A-Z].*\.$/);
      expect(METRIC_HELP[metric].split('.').length).toBe(2);
    }
  });

  it('names outcomes and strokes', () => {
    expect(OUTCOME_LABELS).toEqual({
      clean: 'Clean contact',
      late: 'Late contact',
      'off-balance': 'Off balance on recovery',
      mishit: 'Poor contact',
    });
    expect(STROKE_LABELS).toEqual({ forehand: 'Forehand', backhand: 'Backhand', serve: 'Serve' });
  });

  it('pluralises strokes for mid-sentence use', () => {
    expect(strokePlural('backhand')).toBe('backhands');
    expect(strokePlural('backhand', 3)).toBe('backhands');
    expect(strokePlural('serve', 1)).toBe('serve');
    expect(strokePlural('forehand', 0)).toBe('forehands');
  });

  it('treats everything but clean as a problem outcome', () => {
    expect(isProblemOutcome('clean')).toBe(false);
    expect(isProblemOutcome('late')).toBe(true);
    expect(isProblemOutcome('off-balance')).toBe(true);
    expect(isProblemOutcome('mishit')).toBe(true);
  });
});

describe('scoreOf', () => {
  it('rounds 0..1 to a 0..100 score', () => {
    expect(scoreOf(0.4)).toBe(40);
    expect(scoreOf(0.885)).toBe(89);
    expect(scoreOf(0)).toBe(0);
    expect(scoreOf(1)).toBe(100);
  });
});

describe('formatShotTime', () => {
  it('uses m:ss under an hour', () => {
    expect(formatShotTime(0)).toBe('0:00');
    expect(formatShotTime(48)).toBe('0:48');
    expect(formatShotTime(232.9)).toBe('3:52');
    expect(formatShotTime(3599)).toBe('59:59');
  });

  it('uses h:mm:ss at or above an hour', () => {
    expect(formatShotTime(3600)).toBe('1:00:00');
    expect(formatShotTime(147000)).toBe('40:50:00');
    expect(formatShotTime(3661)).toBe('1:01:01');
  });

  it('clamps negative and non-finite input to zero', () => {
    expect(formatShotTime(-5)).toBe('0:00');
    expect(formatShotTime(Number.NaN)).toBe('0:00');
  });
});

describe('describeShot', () => {
  it('picks the lowest metric as primary and the next weak ones as supporting', () => {
    const insight = describeShot(getShot(demoSession, 'shot-03'));
    expect(insight.primaryMetric).toBe('balance');
    expect(insight.primaryScore).toBe(39);
    expect(insight.supporting).toEqual([
      { metric: 'recovery', score: 44 },
      { metric: 'spacing', score: 55 },
    ]);
    expect(insight.isStrong).toBe(false);
  });

  it('maps outcome + primary metric to a main issue', () => {
    expect(describeShot(shotWith({
      outcome: 'off-balance',
      metrics: { balance: 0.6, spacing: 0.7, recovery: 0.4, rotation: 0.8 },
    })).mainIssue).toBe('Off balance on recovery');
    expect(describeShot(shotWith({
      outcome: 'late',
      metrics: { balance: 0.7, spacing: 0.4, recovery: 0.6, rotation: 0.8 },
    })).mainIssue).toBe('Late contact, crowded by the ball');
    expect(describeShot(shotWith({
      outcome: 'mishit',
      metrics: { balance: 0.7, spacing: 0.4, recovery: 0.6, rotation: 0.8 },
    })).mainIssue).toBe('Poor contact, ball too close');
    expect(describeShot(shotWith({
      outcome: 'clean',
      metrics: { balance: 0.8, spacing: 0.8, recovery: 0.6, rotation: 0.8 },
    })).mainIssue).toBe('Slow recovery after contact');
  });

  it('calls a shot strong when every metric is at least 0.75', () => {
    const insight = describeShot(getShot(demoSession, 'shot-06'));
    expect(insight.isStrong).toBe(true);
    expect(insight.mainIssue).toBe('Strong technique');
    expect(insight.primaryMetric).toBe('rotation');
    expect(insight.supporting).toEqual([{ metric: 'spacing', score: 85 }]);
    expect(describeShot(shotWith({
      outcome: 'clean',
      metrics: { balance: 0.75, spacing: 0.75, recovery: 0.75, rotation: 0.74 },
    })).isStrong).toBe(false);
  });

  it('keeps supporting to at most two metrics, only weak ones when any exist', () => {
    const insight = describeShot(shotWith({
      metrics: { balance: 0.3, spacing: 0.9, recovery: 0.5, rotation: 0.95 },
    }));
    expect(insight.supporting).toEqual([{ metric: 'recovery', score: 50 }]);
  });

  it('breaks metric ties in METRIC_NAMES order', () => {
    const insight = describeShot(shotWith({
      metrics: { balance: 0.5, spacing: 0.5, recovery: 0.5, rotation: 0.5 },
    }));
    expect(insight.primaryMetric).toBe('balance');
    expect(insight.supporting.map((row) => row.metric)).toEqual(['spacing', 'recovery']);
  });

  it('uses the note as the why when it reads like coaching', () => {
    expect(describeShot(getShot(demoSession, 'shot-03')).why)
      .toBe('Weight drifts outside the base after contact.');
    expect(describeShot(shotWith({ note: '  Trailing spaces are fine!  ' })).why)
      .toBe('Trailing spaces are fine!');
  });

  it.each([
    'Ambiguous backhand.',
    'Whiff forehand.',
    'Clean backhand. Unmeasured from this view: rotation.',
    'Mishit forehand.',
    'Shot backhand.',
    'no terminal punctuation',
    '',
    `${'x'.repeat(230)}.`,
  ])('generates the why from METRIC_HELP for the note %j', (note) => {
    const insight = describeShot(shotWith({ note }));
    expect(insight.why).toContain(METRIC_HELP[insight.primaryMetric]);
    expect(insight.why).toContain(`${insight.primaryScore} out of 100`);
  });

  it('generates a strong-shot why without a coaching note', () => {
    const insight = describeShot(shotWith({
      outcome: 'clean',
      note: 'Clean forehand.',
      metrics: { balance: 0.9, spacing: 0.8, recovery: 0.85, rotation: 0.95 },
    }));
    expect(insight.isStrong).toBe(true);
    expect(insight.why).toBe(`${METRIC_HELP.spacing} Even your lowest area scored 80 out of 100.`);
  });
});

describe('DRILLS', () => {
  it('has a cue and a drill for every metric', () => {
    for (const metric of METRIC_NAMES) {
      expect(DRILLS[metric].cue).toMatch(/\.$/);
      expect(DRILLS[metric].drill.length).toBeGreaterThan(10);
    }
    expect(DRILLS.recovery.drill).toMatch(/recover to center/i);
    expect(DRILLS.spacing.drill).toMatch(/cone/i);
    expect(DRILLS.balance.drill).toMatch(/split-step/i);
    expect(DRILLS.rotation.drill).toMatch(/shadow swing/i);
  });
});

describe('compare-to-best explanation', () => {
  const comparison = compareShotSets(
    demoSession,
    ['shot-03', 'shot-08', 'shot-11'],
    ['shot-01', 'shot-06', 'shot-09'],
  );

  it('finds the largest absolute delta', () => {
    const difference = biggestDifference(comparison);
    expect(difference.metric).toBe('recovery');
    expect(difference.delta).toBeCloseTo(0.4633, 3);
  });

  it('uses absolute deltas and keeps order on ties', () => {
    expect(biggestDifference({
      baselineIds: [],
      comparisonIds: [],
      metrics: [
        { metric: 'balance', baseline: 0.5, comparison: 0.6, delta: 0.1 },
        { metric: 'spacing', baseline: 0.9, comparison: 0.4, delta: -0.5 },
        { metric: 'recovery', baseline: 0.1, comparison: 0.6, delta: 0.5 },
      ],
    })).toEqual({ metric: 'spacing', delta: -0.5 });
    expect(() => biggestDifference({ baselineIds: [], comparisonIds: [], metrics: [] }))
      .toThrow('empty comparison');
  });

  it('explains the biggest difference with two coaching sentences', () => {
    const explanation = explainDifference(comparison);
    expect(explanation.problem).toBe(
      'Your weight stays outside the base after contact, so the first recovery step comes late.',
    );
    expect(explanation.best).toBe(
      'The first recovery step begins while the finish is still completing.',
    );
  });
});

describe('coachMessage', () => {
  it('describes shown shots', () => {
    expect(coachMessage.shownShots(3, 'similar backhands')).toBe('Coach is showing 3 shots: similar backhands.');
    expect(coachMessage.shownShots(3, 'Similar backhands.')).toBe('Coach is showing 3 shots: Similar backhands.');
    expect(coachMessage.shownShots(1)).toBe('Coach is showing 1 shot for review.');
    expect(coachMessage.shownShots(2, '  ')).toBe('Coach is showing 2 shots for review.');
  });

  it('describes highlighted metrics with friendly labels', () => {
    expect(coachMessage.highlighted(['recovery'])).toBe('Coach highlighted Recovery after contact.');
    expect(coachMessage.highlighted(['recovery', 'balance', 'spacing'])).toBe(
      'Coach highlighted Recovery after contact, Balance through contact and Distance from the ball.',
    );
  });

  it('describes the saved focus and loaded session', () => {
    expect(coachMessage.focusSaved('recovery')).toBe(
      'Recovery after contact saved as your next-practice focus.',
    );
    expect(coachMessage.sessionLoaded('Backhand recovery session', 12)).toBe(
      'Loaded "Backhand recovery session" with 12 shots.',
    );
    expect(coachMessage.sessionLoaded('One', 1)).toBe('Loaded "One" with 1 shot.');
  });

  it('describes selection, reset and the welcome state without jargon', () => {
    const messages = [
      coachMessage.selected(getShot(demoSession, 'shot-08')),
      coachMessage.reset(),
      coachMessage.welcome(),
    ];
    expect(messages[0]).toBe('You selected shot 8, a backhand. Ask your coach what to look at.');
    for (const message of messages) {
      expect(message).not.toMatch(/agent|webmcp|capabilit|tool|protocol|json/i);
    }
  });
});
