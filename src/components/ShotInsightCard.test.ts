// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ShotInsightCard from './ShotInsightCard.vue';
import MetricBreakdown from './MetricBreakdown.vue';
import { METRIC_HELP, METRIC_LABELS, describeShot } from '../domain/coaching';
import { demoSession, type MetricName } from '../domain/session';
import type { ViewMode } from '../state/viewMode';

const shot8 = demoSession.shots[7]!;
const shot6 = demoSession.shots[5]!;

function mountCard(shot = shot8, mode: ViewMode = 'player', highlighted: MetricName[] = []) {
  return mount(ShotInsightCard, {
    props: { shot, highlighted, mode },
  });
}

describe('ShotInsightCard', () => {
  it('renders the empty state when no shot is selected', () => {
    const wrapper = mount(ShotInsightCard, {
      props: { shot: null, highlighted: [], mode: 'player' },
    });
    expect(wrapper.text()).toContain('Selected shot');
    expect(wrapper.text()).toContain('No shot selected');
    expect(wrapper.findAll('button')).toHaveLength(0);
    expect(wrapper.findComponent(MetricBreakdown).exists()).toBe(false);
  });

  it('explains a problem shot before showing numbers', () => {
    const wrapper = mountCard(shot8);
    const insight = describeShot(shot8);
    const text = wrapper.text();

    expect(wrapper.find('h2').text()).toBe('Shot 8 · Backhand');
    expect(text).toContain('Main issue');
    expect(text).toContain(insight.mainIssue);
    expect(text).toContain('Off balance on recovery');
    expect(text).toContain('Why');
    expect(text).toContain(shot8.note);
    expect(text).toContain('Most affected');
    expect(wrapper.find('.metric-line.primary').text()).toContain(`${METRIC_LABELS.recovery}40 / 100`);
    expect(text).toContain('Also affected');
    const supporting = wrapper.findAll('.supporting li').map((li) => li.text());
    expect(supporting).toEqual([
      `${METRIC_LABELS.balance}43 / 100`,
      `${METRIC_LABELS.spacing}57 / 100`,
    ]);
    expect(wrapper.find('.chip').text()).toBe('Needs work');
  });

  it('describes a strong shot positively', () => {
    const wrapper = mountCard(shot6);
    const text = wrapper.text();
    expect(text).toContain('Strength');
    expect(text).toContain('Strong technique');
    expect(wrapper.find('.chip').text()).toBe('Strong shot');
    expect(text).not.toContain('Main issue');
    expect(text).toContain('Lowest area');
    expect(text).toContain('Also solid');
  });

  it('emits find-similar and make-focus with the primary metric', async () => {
    const wrapper = mountCard(shot8);
    const buttons = wrapper.findAll('button');
    const similar = buttons.find((b) => b.text() === 'Find similar shots')!;
    const focus = buttons.find((b) => b.text() === 'Make this my next focus')!;

    await similar.trigger('click');
    expect(wrapper.emitted('find-similar')).toHaveLength(1);

    await focus.trigger('click');
    expect(wrapper.emitted('make-focus')).toEqual([['recovery']]);
  });

  it('hides the metric breakdown behind a disclosure in Player mode', async () => {
    const wrapper = mountCard(shot8, 'player', ['recovery']);
    const toggle = wrapper.find('button[aria-expanded]');
    expect(toggle.text()).toBe('View all metrics');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(wrapper.findComponent(MetricBreakdown).exists()).toBe(false);

    await toggle.trigger('click');
    expect(toggle.attributes('aria-expanded')).toBe('true');
    expect(toggle.text()).toBe('Hide all metrics');
    const breakdown = wrapper.findComponent(MetricBreakdown);
    expect(breakdown.exists()).toBe(true);
    expect(breakdown.props('highlighted')).toEqual(['recovery']);
    expect(breakdown.text()).toContain('Coach highlighted');
    expect(breakdown.text()).toContain(METRIC_HELP.recovery);

    // Selecting another shot collapses the disclosure again.
    await wrapper.setProps({ shot: shot6 });
    expect(wrapper.find('button[aria-expanded]').attributes('aria-expanded')).toBe('false');
    expect(wrapper.findComponent(MetricBreakdown).exists()).toBe(false);
  });

  it('opens the breakdown when the coach highlights a metric in Player mode', async () => {
    const wrapper = mountCard(shot8, 'player', []);
    expect(wrapper.findComponent(MetricBreakdown).exists()).toBe(false);

    await wrapper.setProps({ highlighted: ['recovery'] });
    expect(wrapper.find('button[aria-expanded]').attributes('aria-expanded')).toBe('true');
    const breakdown = wrapper.findComponent(MetricBreakdown);
    expect(breakdown.exists()).toBe(true);
    expect(breakdown.text()).toContain('Coach highlighted');
  });

  it.each<ViewMode>(['analysis', 'developer'])('always shows the breakdown in %s mode', (mode) => {
    const wrapper = mountCard(shot8, mode);
    expect(wrapper.find('button[aria-expanded]').exists()).toBe(false);
    const breakdown = wrapper.findComponent(MetricBreakdown);
    expect(breakdown.exists()).toBe(true);
    expect(breakdown.props('showHelp')).toBe(false);
    expect(wrapper.findAll('[role="meter"]')).toHaveLength(4);
  });

  it('never shows raw metric keys or developer wording to the player', () => {
    const wrapper = mountCard(shot8, 'player', ['recovery']);
    const text = wrapper.text().toLowerCase();
    for (const banned of ['webmcp', 'capability', 'agent', 'protocol', 'json', shot8.id]) {
      expect(text).not.toContain(banned);
    }
  });
});
