import {
  defineCapability,
  type Capability,
} from '@dreamawakelabs/agent-forge';
import {
  compareShotSets,
  findSimilarShots,
  getShot,
  METRIC_NAMES,
  type MetricName,
  type TennisSession,
} from '../domain/session';
import type { ReplayState } from '../state/replayState';

const emptyObjectSchema = {
  type: 'object',
  properties: {},
  additionalProperties: false,
};

function requireShotSelection(state: ReplayState): string {
  if (!state.selectedShotId) {
    throw new Error('Select a shot in Replay Room first.');
  }
  return state.selectedShotId;
}

function assertMetric(value: string): MetricName {
  if (!METRIC_NAMES.includes(value as MetricName)) {
    throw new Error(`Unknown metric: ${value}`);
  }
  return value as MetricName;
}

function validShotIds(session: TennisSession, ids: string[]): string[] {
  if (ids.length === 0) {
    throw new Error('At least one shot id is required.');
  }
  return ids.map((id) => getShot(session, id).id);
}

export function createReplayCapabilities(
  session: TennisSession,
  state: ReplayState,
): Capability<any, any>[] {
  return [
    defineCapability({
      id: 'get_current_shot',
      title: 'Get current shot',
      description: 'Return the tennis shot the human currently has selected in Replay Room, including stroke type, outcome, coaching note, timestamp, and technique metrics.',
      inputSchema: emptyObjectSchema,
      effect: 'read',
      available: () => state.selectedShotId
        ? true
        : { available: false, reason: 'No shot is selected in the workspace.' },
      execute: () => getShot(session, requireShotSelection(state)),
    }),
    defineCapability({
      id: 'find_similar_shots',
      title: 'Find similar shots',
      description: 'Find other shots in this session whose technique metrics are most similar to the currently selected shot. Use this after the human points out an example they want to investigate.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 6,
            description: 'Maximum similar shots to return. Defaults to 3.',
          },
        },
        additionalProperties: false,
      },
      effect: 'read',
      available: () => state.selectedShotId
        ? true
        : { available: false, reason: 'Select an example shot first.' },
      execute: ({ limit = 3 }: { limit?: number }) => {
        const anchorId = requireShotSelection(state);
        return {
          anchorId,
          matches: findSimilarShots(session, anchorId, limit),
          nextStep: 'Call show_shot_set with the relevant match ids to put them into the human workspace.',
        };
      },
    }),
    defineCapability({
      id: 'compare_shot_sets',
      title: 'Compare shot sets',
      description: 'Compare two groups of tennis shots by average balance, spacing, recovery, and rotation. Positive delta means the comparison set scored higher than the baseline set.',
      inputSchema: {
        type: 'object',
        properties: {
          baselineIds: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            description: 'Shot ids for the first group.',
          },
          comparisonIds: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            description: 'Shot ids for the second group.',
          },
        },
        required: ['baselineIds', 'comparisonIds'],
        additionalProperties: false,
      },
      effect: 'read',
      execute: ({ baselineIds, comparisonIds }: { baselineIds: string[]; comparisonIds: string[] }) => compareShotSets(
        session,
        validShotIds(session, baselineIds),
        validShotIds(session, comparisonIds),
      ),
    }),
    defineCapability({
      id: 'show_shot_set',
      title: 'Show shot set',
      description: 'Change the Replay Room workspace to show a specific set of shots. This is a reversible UI action and does not alter the underlying tennis session.',
      inputSchema: {
        type: 'object',
        properties: {
          shotIds: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            description: 'Shot ids to place in the review rail.',
          },
          reason: {
            type: 'string',
            maxLength: 180,
            description: 'Short human-readable reason for showing this set.',
          },
        },
        required: ['shotIds'],
        additionalProperties: false,
      },
      effect: 'reversible-write',
      execute: ({ shotIds, reason }: { shotIds: string[]; reason?: string }) => {
        const ids = validShotIds(session, shotIds);
        state.visibleShotIds = ids;
        state.selectedShotId = ids[0] ?? state.selectedShotId;
        state.lastAgentAction = reason
          ? `Agent showed ${ids.length} shots: ${reason}`
          : `Agent showed ${ids.length} shots for review.`;
        return { visibleShotIds: ids, selectedShotId: state.selectedShotId };
      },
    }),
    defineCapability({
      id: 'highlight_metrics',
      title: 'Highlight technique metrics',
      description: 'Highlight one or more technique metrics in the visible Replay Room analysis panel so the human can inspect the differences. This is a reversible UI action.',
      inputSchema: {
        type: 'object',
        properties: {
          metrics: {
            type: 'array',
            items: { type: 'string', enum: [...METRIC_NAMES] },
            minItems: 1,
            uniqueItems: true,
          },
        },
        required: ['metrics'],
        additionalProperties: false,
      },
      effect: 'reversible-write',
      execute: ({ metrics }: { metrics: string[] }) => {
        state.highlightedMetrics = metrics.map(assertMetric);
        state.lastAgentAction = `Agent highlighted ${state.highlightedMetrics.join(', ')}.`;
        return { highlightedMetrics: state.highlightedMetrics };
      },
    }),
    defineCapability({
      id: 'set_next_session_focus',
      title: 'Set next-session focus',
      description: 'Set the coaching focus saved in the visible next-session plan. Use only after the human asks to make a technique issue the focus for the next session. The plan can be changed again at any time.',
      inputSchema: {
        type: 'object',
        properties: {
          focus: {
            type: 'string',
            enum: [...METRIC_NAMES],
            description: 'Technique metric to emphasize next session.',
          },
          note: {
            type: 'string',
            maxLength: 220,
            description: 'Short coaching note shown with the plan.',
          },
        },
        required: ['focus'],
        additionalProperties: false,
      },
      effect: 'reversible-write',
      execute: ({ focus, note = '' }: { focus: string; note?: string }) => {
        state.coachingPlan.focus = assertMetric(focus);
        state.coachingPlan.note = note;
        state.lastAgentAction = `Agent set next-session focus to ${focus}.`;
        return { ...state.coachingPlan };
      },
    }),
  ];
}
