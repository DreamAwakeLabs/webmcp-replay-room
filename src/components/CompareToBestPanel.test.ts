// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import CompareToBestPanel from './CompareToBestPanel.vue';
import {
  bestShots,
  compareShotSets,
  demoSession,
  getShot,
  type Shot,
} from '../domain/session';
import type { ViewMode } from '../state/viewMode';

const problem: Shot[] = ['shot-03', 'shot-08', 'shot-11'].map((id) => getShot(demoSession, id));
const reference: Shot[] = bestShots(demoSession, 'backhand');
const comparison = compareShotSets(
  demoSession,
  problem.map((s) => s.id),
  reference.map((s) => s.id),
);

function mountPanel(mode: ViewMode, withComparison: boolean) {
  return mount(CompareToBestPanel, {
    props: {
      problemShots: withComparison ? problem : [],
      referenceShots: withComparison ? reference : [],
      comparison: withComparison ? comparison : null,
      stroke: 'backhand',
      mode,
    },
  });
}

describe('CompareToBestPanel', () => {
  it('offers the compare button for the selected stroke and emits compare', async () => {
    const wrapper = mountPanel('player', false);
    expect(wrapper.text()).toContain('Compare to your best');
    const button = wrapper.find('button.primary');
    expect(button.text()).toBe('Compare to my best backhands');
    expect(button.attributes('disabled')).toBeUndefined();
    await button.trigger('click');
    expect(wrapper.emitted('compare')).toEqual([[]]);
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('disables the button with a hint when no stroke is known', () => {
    const wrapper = mount(CompareToBestPanel, {
      props: { problemShots: [], referenceShots: [], comparison: null, stroke: null, mode: 'player' },
    });
    expect(wrapper.find('button.primary').attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('Pick a shot first');
  });

  it('explains the biggest difference in player mode without a delta table', async () => {
    const wrapper = mountPanel('player', true);
    expect(wrapper.text()).toContain('Biggest difference: Recovery after contact');
    expect(wrapper.text()).toContain('Your problem shots');
    expect(wrapper.text()).toContain('Shots 3, 8, 11');
    expect(wrapper.text()).toContain('first recovery step comes late');
    expect(wrapper.text()).toContain('Your best shots');
    expect(wrapper.text()).toContain('Shots 6, 1, 9');
    expect(wrapper.text()).toContain('while the finish is still completing');
    expect(wrapper.find('table').exists()).toBe(false);

    const clear = wrapper.findAll('button').find((b) => b.text() === 'Clear comparison');
    await clear!.trigger('click');
    expect(wrapper.emitted('clear')).toEqual([[]]);
  });

  it.each<ViewMode>(['analysis', 'developer'])('renders the delta table in %s mode', (mode) => {
    const wrapper = mountPanel(mode, true);
    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(4);

    const recovery = rows.find((row) => row.text().includes('Recovery after contact'))!;
    expect(recovery.classes()).toContain('is-largest');
    expect(recovery.text()).toContain('largest');
    const cells = recovery.findAll('td').map((c) => c.text());
    expect(cells).toEqual(['43', '89', '+46']);

    const others = rows.filter((row) => row !== recovery);
    expect(others.every((row) => !row.classes().includes('is-largest'))).toBe(true);
  });
});
