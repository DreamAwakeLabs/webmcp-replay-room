// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import NextSessionCard from './NextSessionCard.vue';
import { DRILLS, METRIC_LABELS, describeShot } from '../domain/coaching';
import { demoSession, type MetricName } from '../domain/session';
import type { CoachingPlan } from '../state/replayState';
import type { ViewMode } from '../state/viewMode';

const problemShot = demoSession.shots.find((shot) => shot.id === 'shot-03')!;
const suggested = describeShot(problemShot).primaryMetric; // balance

function mountCard(
  plan: CoachingPlan,
  mode: ViewMode = 'player',
  suggestedFocus: MetricName | null = suggested,
) {
  return mount(NextSessionCard, { props: { plan, suggestedFocus, mode } });
}

describe('NextSessionCard with a focus', () => {
  it('shows the label, the saved note as cue, and the deterministic drill', () => {
    const wrapper = mountCard({ focus: 'recovery', note: 'Start moving before the finish.' });
    const text = wrapper.text();
    expect(text).toContain('Next practice');
    expect(text).toContain(METRIC_LABELS.recovery);
    expect(text).toContain('Start moving before the finish.');
    expect(text).not.toContain(DRILLS.recovery.cue);
    expect(text).toContain(DRILLS.recovery.drill);
    expect(text).toContain('Observed');
    expect(text).toContain('Recommended');
    expect(text).not.toContain('No focus yet');
  });

  it('falls back to the drill cue when the plan note is blank', () => {
    const wrapper = mountCard({ focus: suggested, note: '   ' });
    expect(wrapper.text()).toContain(DRILLS[suggested].cue);
  });

  it('hides raw metric keys outside developer mode', () => {
    const plan: CoachingPlan = { focus: 'recovery', note: '' };
    expect(mountCard(plan, 'player').find('.metric-key').exists()).toBe(false);
    expect(mountCard(plan, 'analysis').find('.metric-key').exists()).toBe(false);
    expect(mountCard(plan, 'developer').find('.metric-key').text()).toBe('recovery');
  });

  it('emits clear-focus from Clear', async () => {
    const wrapper = mountCard({ focus: 'recovery', note: '' });
    await wrapper.find('.clear-button').trigger('click');
    expect(wrapper.emitted('clear-focus')).toHaveLength(1);
  });

  it('Change reveals the other focus areas and emits set-focus for the chosen one', async () => {
    const wrapper = mountCard({ focus: 'recovery', note: '' });
    expect(wrapper.find('.options').exists()).toBe(false);
    await wrapper.find('.change-button').trigger('click');
    const options = wrapper.findAll('.option-button');
    expect(options.map((option) => option.attributes('data-metric'))).toEqual([
      'balance',
      'spacing',
      'rotation',
    ]);
    await wrapper.find('.option-button[data-metric="spacing"]').trigger('click');
    expect(wrapper.emitted('set-focus')).toEqual([['spacing']]);
    expect(wrapper.find('.options').exists()).toBe(false);
  });
});

describe('NextSessionCard empty state', () => {
  it('offers the suggested focus from a real problem shot', async () => {
    const wrapper = mountCard({ focus: null, note: '' });
    expect(wrapper.text()).toContain('No focus yet');
    const button = wrapper.find('.suggest-button');
    expect(button.text()).toBe(`Make ${METRIC_LABELS[suggested]} my focus`);
    await button.trigger('click');
    expect(wrapper.emitted('set-focus')).toEqual([[suggested]]);
  });

  it('shows no button when there is nothing to suggest', () => {
    const wrapper = mountCard({ focus: null, note: '' }, 'player', null);
    expect(wrapper.text()).toContain('No focus yet');
    expect(wrapper.find('.suggest-button').exists()).toBe(false);
    expect(wrapper.find('.clear-button').exists()).toBe(false);
  });
});
