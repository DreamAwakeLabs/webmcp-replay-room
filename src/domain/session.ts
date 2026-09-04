export const METRIC_NAMES = [
  'balance',
  'spacing',
  'recovery',
  'rotation',
] as const;

export type MetricName = (typeof METRIC_NAMES)[number];
export type StrokeType = 'forehand' | 'backhand' | 'serve';

export type ShotMetrics = Record<MetricName, number>;

/** Optional media captured for a shot. Absent means no video/frame exists. */
export interface ShotMedia {
  clipUrl?: string;
  posterUrl?: string;
}

/**
 * How the court x/y positions were produced. `measured` = derived from real
 * tracking; `synthetic` = placeholder positions (Tennisbot exports). Absent
 * means unknown and is treated as approximate by the UI.
 */
export type CourtPositionSource = 'measured' | 'synthetic';

export interface Shot {
  id: string;
  number: number;
  stroke: StrokeType;
  outcome: 'clean' | 'late' | 'off-balance' | 'mishit';
  timestampSeconds: number;
  metrics: ShotMetrics;
  note: string;
  court: { x: number; y: number };
  media?: ShotMedia;
}

export interface TennisSession {
  id: string;
  title: string;
  dateLabel: string;
  durationMinutes: number;
  shots: Shot[];
  courtPositions?: CourtPositionSource;
}

export interface MetricComparison {
  metric: MetricName;
  baseline: number;
  comparison: number;
  delta: number;
}

export interface ShotSetComparison {
  baselineIds: string[];
  comparisonIds: string[];
  metrics: MetricComparison[];
}

export const demoSession: TennisSession = {
  id: 'challenge-demo-01',
  title: 'Backhand recovery session',
  dateLabel: 'Demo session',
  durationMinutes: 18,
  shots: [
    { id: 'shot-01', number: 1, stroke: 'backhand', outcome: 'clean', timestampSeconds: 18, metrics: { balance: 0.88, spacing: 0.82, recovery: 0.91, rotation: 0.79 }, note: 'Early contact and stable finish.', court: { x: 31, y: 58 } },
    { id: 'shot-02', number: 2, stroke: 'forehand', outcome: 'clean', timestampSeconds: 31, metrics: { balance: 0.84, spacing: 0.79, recovery: 0.86, rotation: 0.83 }, note: 'Good spacing through contact.', court: { x: 62, y: 55 } },
    { id: 'shot-03', number: 3, stroke: 'backhand', outcome: 'off-balance', timestampSeconds: 48, metrics: { balance: 0.39, spacing: 0.55, recovery: 0.44, rotation: 0.76 }, note: 'Weight drifts outside the base after contact.', court: { x: 24, y: 66 } },
    { id: 'shot-04', number: 4, stroke: 'backhand', outcome: 'late', timestampSeconds: 64, metrics: { balance: 0.51, spacing: 0.48, recovery: 0.49, rotation: 0.68 }, note: 'Crowded contact creates a late recovery step.', court: { x: 27, y: 63 } },
    { id: 'shot-05', number: 5, stroke: 'serve', outcome: 'clean', timestampSeconds: 85, metrics: { balance: 0.81, spacing: 0.74, recovery: 0.78, rotation: 0.87 }, note: 'Balanced landing inside the court.', court: { x: 49, y: 72 } },
    { id: 'shot-06', number: 6, stroke: 'backhand', outcome: 'clean', timestampSeconds: 107, metrics: { balance: 0.9, spacing: 0.85, recovery: 0.89, rotation: 0.82 }, note: 'Strong reference backhand.', court: { x: 33, y: 57 } },
    { id: 'shot-07', number: 7, stroke: 'forehand', outcome: 'mishit', timestampSeconds: 123, metrics: { balance: 0.69, spacing: 0.43, recovery: 0.71, rotation: 0.65 }, note: 'Ball gets too close to the body.', court: { x: 66, y: 60 } },
    { id: 'shot-08', number: 8, stroke: 'backhand', outcome: 'off-balance', timestampSeconds: 141, metrics: { balance: 0.43, spacing: 0.57, recovery: 0.4, rotation: 0.73 }, note: 'Very similar recovery leak to shot 3.', court: { x: 22, y: 67 } },
    { id: 'shot-09', number: 9, stroke: 'backhand', outcome: 'clean', timestampSeconds: 164, metrics: { balance: 0.86, spacing: 0.81, recovery: 0.88, rotation: 0.8 }, note: 'Compact recovery and centered finish.', court: { x: 35, y: 55 } },
    { id: 'shot-10', number: 10, stroke: 'serve', outcome: 'late', timestampSeconds: 188, metrics: { balance: 0.72, spacing: 0.7, recovery: 0.64, rotation: 0.77 }, note: 'Landing pulls slightly left.', court: { x: 51, y: 73 } },
    { id: 'shot-11', number: 11, stroke: 'backhand', outcome: 'off-balance', timestampSeconds: 209, metrics: { balance: 0.47, spacing: 0.59, recovery: 0.45, rotation: 0.72 }, note: 'Recovery starts after the finish instead of through it.', court: { x: 26, y: 65 } },
    { id: 'shot-12', number: 12, stroke: 'forehand', outcome: 'clean', timestampSeconds: 232, metrics: { balance: 0.87, spacing: 0.8, recovery: 0.83, rotation: 0.88 }, note: 'Strong rotational sequence.', court: { x: 64, y: 53 } },
  ],
};

export function getShot(session: TennisSession, shotId: string): Shot {
  const shot = session.shots.find((candidate) => candidate.id === shotId);
  if (!shot) {
    throw new Error(`Unknown shot id: ${shotId}`);
  }
  return shot;
}

function metricDistance(a: ShotMetrics, b: ShotMetrics): number {
  return Math.sqrt(METRIC_NAMES.reduce((sum, metric) => {
    const delta = a[metric] - b[metric];
    return sum + delta * delta;
  }, 0));
}

export function findSimilarShots(
  session: TennisSession,
  anchorId: string,
  limit = 3,
): Shot[] {
  const anchor = getShot(session, anchorId);
  return session.shots
    .filter((shot) => shot.id !== anchor.id)
    .map((shot) => ({
      shot,
      score: metricDistance(anchor.metrics, shot.metrics)
        + (shot.stroke === anchor.stroke ? 0 : 0.45),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, Math.max(1, Math.min(limit, 6)))
    .map(({ shot }) => shot);
}

function averageMetric(
  shots: Shot[],
  metric: MetricName,
): number {
  if (shots.length === 0) {
    throw new Error('Cannot compare an empty shot set.');
  }
  return shots.reduce((sum, shot) => sum + shot.metrics[metric], 0) / shots.length;
}

export function compareShotSets(
  session: TennisSession,
  baselineIds: string[],
  comparisonIds: string[],
): ShotSetComparison {
  const baseline = baselineIds.map((id) => getShot(session, id));
  const comparison = comparisonIds.map((id) => getShot(session, id));

  return {
    baselineIds,
    comparisonIds,
    metrics: METRIC_NAMES.map((metric) => {
      const baselineValue = averageMetric(baseline, metric);
      const comparisonValue = averageMetric(comparison, metric);
      return {
        metric,
        baseline: baselineValue,
        comparison: comparisonValue,
        delta: comparisonValue - baselineValue,
      };
    }),
  };
}

export function bestShots(
  session: TennisSession,
  stroke: StrokeType,
  limit = 3,
): Shot[] {
  return session.shots
    .filter((shot) => shot.stroke === stroke)
    .map((shot) => ({
      shot,
      score: METRIC_NAMES.reduce((sum, metric) => sum + shot.metrics[metric], 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ shot }) => shot);
}
