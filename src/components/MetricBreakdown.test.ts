// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MetricBreakdown from './MetricBreakdown.vue';
import { METRIC_HELP, METRIC_LABELS } from '../domain/coaching';
import { demoSession } from '../domain/session';

const shot8 = demoSession.shots[7]!;

describe('MetricBreakdown', () => {
  it('renders one labelled meter row per metric with its score', () => {
    const wrapper = mount(MetricBreakdown, {
      props: { metrics: shot8.metrics, highlighted: [] },
    });
    const rows = wrapper.findAll('li.row');
    expect(rows).toHaveLength(4);

    const recovery = wrapper.find('[data-metric="recovery"]');
    expect(recovery.text()).toContain(METRIC_LABELS.recovery);
    expect(recovery.text()).toContain('40');
    const meter = recovery.find('[role="meter"]');
    expect(meter.attributes('aria-valuenow')).toBe('40');
    expect(meter.attributes('aria-valuemin')).toBe('0');
    expect(meter.attributes('aria-valuemax')).toBe('100');
    expect(meter.attributes('aria-label')).toBe(`${METRIC_LABELS.recovery} score`);
    expect(recovery.find('.fill').attributes('style')).toContain('width: 40%');

    expect(wrapper.findAll('.highlight-tag')).toHaveLength(0);
    expect(wrapper.text()).not.toContain(METRIC_HELP.recovery);
  });

  it('shows a visible "Coach highlighted" tag only on highlighted rows', () => {
    const wrapper = mount(MetricBreakdown, {
      props: { metrics: shot8.metrics, highlighted: ['recovery', 'balance'] },
    });
    const tagged = wrapper.findAll('li.row.is-highlighted');
    expect(tagged.map((row) => row.attributes('data-metric'))).toEqual(['balance', 'recovery']);
    for (const row of tagged) {
      expect(row.text()).toContain('Coach highlighted');
    }
    expect(wrapper.find('[data-metric="spacing"]').text()).not.toContain('Coach highlighted');
  });

  it('shows help text for every metric when showHelp is set', () => {
    const wrapper = mount(MetricBreakdown, {
      props: { metrics: shot8.metrics, highlighted: [], showHelp: true },
    });
    for (const help of Object.values(METRIC_HELP)) {
      expect(wrapper.text()).toContain(help);
    }
  });
});
