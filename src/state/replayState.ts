import { coachMessage } from '../domain/coaching';
import type { MetricName, TennisSession } from '../domain/session';

export interface CoachingPlan {
  focus: MetricName | null;
  note: string;
}

export interface ReplayState {
  selectedShotId: string | null;
  visibleShotIds: string[];
  highlightedMetrics: MetricName[];
  coachingPlan: CoachingPlan;
  lastAgentAction: string;
}

export function createReplayState(session: TennisSession): ReplayState {
  return {
    selectedShotId: session.shots[2]?.id ?? session.shots[0]?.id ?? null,
    visibleShotIds: [],
    highlightedMetrics: [],
    coachingPlan: {
      focus: null,
      note: '',
    },
    lastAgentAction: coachMessage.welcome(),
  };
}
