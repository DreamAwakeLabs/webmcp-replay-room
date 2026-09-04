import {
  METRIC_NAMES,
  type MetricName,
  type Shot,
  type ShotSetComparison,
  type StrokeType,
} from './session';

/**
 * The single source of player-facing language. Raw metric keys, outcomes and
 * stroke ids stay unchanged in the domain model and capability schemas; the
 * UI maps them through this module (spec sections 12, 13, 14A, 17, 18, 21).
 */

export const METRIC_LABELS: Record<MetricName, string> = {
  balance: 'Balance through contact',
  spacing: 'Distance from the ball',
  recovery: 'Recovery after contact',
  rotation: 'Shoulder & hip rotation',
};

export const METRIC_HELP: Record<MetricName, string> = {
  balance: 'How steady your body stays while you hit the ball.',
  spacing: 'How much room you leave between your body and the ball at contact.',
  recovery: 'How quickly you get back to a ready position after the hit.',
  rotation: 'How well your shoulders and hips turn together into the shot.',
};

export const OUTCOME_LABELS: Record<Shot['outcome'], string> = {
  clean: 'Clean contact',
  late: 'Late contact',
  'off-balance': 'Off balance on recovery',
  mishit: 'Poor contact',
};

export const STROKE_LABELS: Record<StrokeType, string> = {
  forehand: 'Forehand',
  backhand: 'Backhand',
  serve: 'Serve',
};

/** Lowercase stroke name for use mid-sentence, pluralised unless count is 1. */
export function strokePlural(stroke: StrokeType, count = 2): string {
  const singular = STROKE_LABELS[stroke].toLowerCase();
  return count === 1 ? singular : `${singular}s`;
}

export function isProblemOutcome(outcome: Shot['outcome']): boolean {
  return outcome !== 'clean';
}

/** 0..1 metric value as a 0..100 score. */
export function scoreOf(value: number): number {
  return Math.round(value * 100);
}

/** m:ss under an hour, h:mm:ss at or above (Tennisbot sessions reach 147000 s). */
export function formatShotTime(seconds: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${minutes}:${pad(secs)}`;
}

/** Every metric at or above this value counts as strong technique. */
export const STRONG_THRESHOLD = 0.75;

export interface ShotInsight {
  primaryMetric: MetricName;
  primaryScore: number;
  supporting: { metric: MetricName; score: number }[];
  mainIssue: string;
  why: string;
  isStrong: boolean;
}

const MAIN_ISSUES: Record<Shot['outcome'], Record<MetricName, string>> = {
  'off-balance': {
    recovery: 'Off balance on recovery',
    balance: 'Lost balance through contact',
    spacing: 'Off balance, crowded by the ball',
    rotation: 'Off balance with limited rotation',
  },
  late: {
    spacing: 'Late contact, crowded by the ball',
    recovery: 'Late contact, slow recovery',
    balance: 'Late contact off an unsteady base',
    rotation: 'Late contact with limited rotation',
  },
  mishit: {
    spacing: 'Poor contact, ball too close',
    recovery: 'Poor contact, slow recovery',
    balance: 'Poor contact off an unsteady base',
    rotation: 'Poor contact with limited rotation',
  },
  clean: {
    recovery: 'Slow recovery after contact',
    balance: 'Balance drifts through contact',
    spacing: 'Crowded by the ball',
    rotation: 'Limited shoulder & hip rotation',
  },
};

/** Exporter template notes ("Clean backhand.", "Ambiguous forehand.") are not coaching. */
const TEMPLATE_NOTE_PREFIXES = ['Ambiguous', 'Whiff', 'Clean ', 'Mishit ', 'Shot '];
const MAX_NOTE_LENGTH = 220;

function looksLikeCoachingSentence(note: string): boolean {
  const text = note.trim();
  if (text.length === 0 || text.length >= MAX_NOTE_LENGTH) {
    return false;
  }
  if (!/[.!?]$/.test(text)) {
    return false;
  }
  return !TEMPLATE_NOTE_PREFIXES.some((prefix) => text.startsWith(prefix));
}

/** Metrics sorted lowest first; ties keep METRIC_NAMES order. */
function rankMetrics(shot: Shot): MetricName[] {
  return [...METRIC_NAMES].sort((a, b) => shot.metrics[a] - shot.metrics[b]);
}

export function describeShot(shot: Shot): ShotInsight {
  const ranked = rankMetrics(shot);
  const primaryMetric = ranked[0]!;
  const primaryScore = scoreOf(shot.metrics[primaryMetric]);
  const isStrong = METRIC_NAMES.every((metric) => shot.metrics[metric] >= STRONG_THRESHOLD);

  const weakNext = ranked
    .slice(1, 3)
    .filter((metric) => shot.metrics[metric] < STRONG_THRESHOLD);
  const supportingMetrics = weakNext.length > 0 ? weakNext : [ranked[1]!];
  const supporting = supportingMetrics.map((metric) => ({
    metric,
    score: scoreOf(shot.metrics[metric]),
  }));

  const mainIssue = isStrong
    ? 'Strong technique'
    : MAIN_ISSUES[shot.outcome][primaryMetric];

  let why: string;
  if (looksLikeCoachingSentence(shot.note)) {
    why = shot.note.trim();
  } else if (isStrong) {
    why = `${METRIC_HELP[primaryMetric]} Even your lowest area scored ${primaryScore} out of 100.`;
  } else {
    why = `${METRIC_HELP[primaryMetric]} This was the weakest part of the shot at ${primaryScore} out of 100.`;
  }

  return { primaryMetric, primaryScore, supporting, mainIssue, why, isStrong };
}

export interface Drill {
  cue: string;
  drill: string;
}

/** Deterministic drill per focus area (spec section 18). */
export const DRILLS: Record<MetricName, Drill> = {
  recovery: {
    cue: 'Start the first recovery step before the finish fully settles.',
    drill: 'Cross-court backhand + recover to center: 3 sets of 8 reps.',
  },
  spacing: {
    cue: 'Meet the ball about a racket length in front and to the side of your body.',
    drill: 'Feed variation with spacing cones: 3 sets of 10 feeds at different depths.',
  },
  balance: {
    cue: 'Hold a controlled finish for a beat, then split-step.',
    drill: 'Controlled finish and split-step recovery: 3 sets of 8 shots holding the finish.',
  },
  rotation: {
    cue: 'Turn shoulders and hips together before the swing starts.',
    drill: 'Shadow swings with a full shoulder turn: 3 sets of 10 without a ball.',
  },
};

/** The metric with the largest absolute delta; ties keep comparison order. */
export function biggestDifference(
  comparison: ShotSetComparison,
): { metric: MetricName; delta: number } {
  const first = comparison.metrics[0];
  if (!first) {
    throw new Error('Cannot explain an empty comparison.');
  }
  let best = first;
  for (const row of comparison.metrics) {
    if (Math.abs(row.delta) > Math.abs(best.delta)) {
      best = row;
    }
  }
  return { metric: best.metric, delta: best.delta };
}

const DIFFERENCE_EXPLANATIONS: Record<MetricName, { problem: string; best: string }> = {
  recovery: {
    problem: 'Your weight stays outside the base after contact, so the first recovery step comes late.',
    best: 'The first recovery step begins while the finish is still completing.',
  },
  balance: {
    problem: 'Your body keeps moving after contact instead of settling into the finish.',
    best: 'Your base stays planted through contact and the finish holds still.',
  },
  spacing: {
    problem: 'The ball gets too close to your body and cramps the swing.',
    best: 'Contact happens a comfortable distance in front, with room to swing.',
  },
  rotation: {
    problem: 'Your shoulders and hips open early or stop short, so the swing loses its turn.',
    best: 'Your shoulders and hips turn together into contact and release into the finish.',
  },
};

/**
 * Two coaching sentences for the annotated compare-to-best explanation
 * (spec 16D). Baseline = problem shots, comparison = best shots.
 */
export function explainDifference(
  comparison: ShotSetComparison,
): { problem: string; best: string } {
  const { metric } = biggestDifference(comparison);
  return { ...DIFFERENCE_EXPLANATIONS[metric] };
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) {
    return labels[0] ?? '';
  }
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

function stripTrailingPeriod(text: string): string {
  return text.trim().replace(/\.+$/, '');
}

/** Player-facing "what changed" messages (spec section 21). */
export const coachMessage = {
  shownShots(count: number, reason?: string): string {
    const shots = count === 1 ? 'shot' : 'shots';
    const detail = reason?.trim() ? `: ${stripTrailingPeriod(reason)}` : ' for review';
    return `Coach is showing ${count} ${shots}${detail}.`;
  },
  highlighted(metrics: readonly MetricName[]): string {
    return `Coach highlighted ${joinLabels(metrics.map((metric) => METRIC_LABELS[metric]))}.`;
  },
  focusSaved(metric: MetricName): string {
    return `${METRIC_LABELS[metric]} saved as your next-practice focus.`;
  },
  sessionLoaded(title: string, count: number): string {
    return `Loaded "${title}" with ${count} ${count === 1 ? 'shot' : 'shots'}.`;
  },
  selected(shot: Shot): string {
    return `You selected shot ${shot.number}, a ${strokePlural(shot.stroke, 1)}. Ask your coach what to look at.`;
  },
  reset(): string {
    return 'Showing the full session again.';
  },
  welcome(): string {
    return 'Pick a shot, then ask your coach to look into it.';
  },
};
