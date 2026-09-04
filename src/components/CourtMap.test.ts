// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import CourtMap from './CourtMap.vue';
import { demoSession, type Shot } from '../domain/session';

interface MapProps {
  shots: Shot[];
  selectedId: string | null;
  comparisonIds: string[];
  compact?: boolean;
  source?: 'measured' | 'synthetic' | null;
}

function mountMap(props: Partial<MapProps> = {}) {
  return mount(CourtMap, {
    props: {
      shots: demoSession.shots,
      selectedId: null,
      comparisonIds: [],
      ...props,
    },
  });
}

describe('CourtMap', () => {
  it('labels synthetic positions as illustrative in the caption, title and aria-label', () => {
    const wrapper = mountMap({ source: 'synthetic', selectedId: 'shot-03' });
    expect(wrapper.classes()).toContain('is-illustrative');
    expect(wrapper.find('svg').attributes('aria-label')).toBe(
      'Court map with 12 shots, 1 selected. Illustrative placement, court position not tracked.',
    );
    expect(wrapper.find('title').text()).toBe('Court map, illustrative placement, court position not tracked');
    expect(wrapper.text()).toContain('Illustrative placement, court position not tracked');
    expect(wrapper.text()).not.toContain('Approximate positions');
    expect(wrapper.findAll('[data-shot-id]')).toHaveLength(12);
  });

  it('treats measured and unflagged positions as approximate', () => {
    expect(mountMap({ source: 'measured' }).classes()).not.toContain('is-illustrative');
    expect(mountMap({ source: 'measured' }).text()).toContain('Approximate positions');
    expect(mountMap({ source: null }).text()).toContain('Approximate positions');
  });

  it('draws one marker per shot with an accessible summary', () => {
    const wrapper = mountMap();
    const svg = wrapper.find('svg');
    expect(svg.attributes('role')).toBe('img');
    expect(svg.attributes('aria-label')).toBe(
      'Court map with 12 shots, none selected. Approximate positions.',
    );
    expect(svg.find('title').text()).toContain('Court map');
    expect(wrapper.findAll('[data-shot-id]')).toHaveLength(12);
    expect(wrapper.findAll('[data-kind="other"]')).toHaveLength(12);
    expect(wrapper.text()).toContain('Approximate positions');
    expect(wrapper.find('path').exists()).toBe(false);
  });

  it('marks the selected shot and uses a distinct shape for comparison shots', () => {
    const wrapper = mountMap({ selectedId: 'shot-08', comparisonIds: ['shot-03', 'shot-11'] });
    const selected = wrapper.find('[data-shot-id="shot-08"]');
    expect(selected.attributes('data-kind')).toBe('selected');
    expect(selected.find('circle.is-selected').exists()).toBe(true);

    const comparison = wrapper.findAll('[data-kind="comparison"]');
    expect(comparison).toHaveLength(2);
    expect(comparison[0]!.find('polygon.is-comparison').exists()).toBe(true);
    expect(comparison[0]!.find('circle').exists()).toBe(false);

    expect(wrapper.find('svg').attributes('aria-label')).toBe(
      'Court map with 12 shots, 1 selected, 2 in comparison. Approximate positions.',
    );
    expect(wrapper.text()).toContain('Comparison');
    const groups = wrapper.findAll('[data-shot-id]');
    expect(groups[groups.length - 1]!.attributes('data-shot-id')).toBe('shot-08');
  });

  it('selected wins over comparison for the same id', () => {
    const wrapper = mountMap({ selectedId: 'shot-03', comparisonIds: ['shot-03'] });
    expect(wrapper.find('[data-shot-id="shot-03"]').attributes('data-kind')).toBe('selected');
    expect(wrapper.findAll('[data-kind="comparison"]')).toHaveLength(0);
  });

  it('places markers inside the court from court.x/y percentages', () => {
    const wrapper = mountMap({ selectedId: 'shot-08' });
    const circle = wrapper.find('[data-shot-id="shot-08"] circle');
    // court.x 22, court.y 67 on a 36 x 78 court with a 6 unit margin
    expect(Number(circle.attributes('cx'))).toBeCloseTo(6 + 0.22 * 36, 5);
    expect(Number(circle.attributes('cy'))).toBeCloseTo(6 + 0.67 * 78, 5);
  });

  it('handles an empty shot list and the compact flag', () => {
    const wrapper = mountMap({ shots: [], compact: true });
    expect(wrapper.findAll('[data-shot-id]')).toHaveLength(0);
    expect(wrapper.find('svg').attributes('aria-label')).toBe(
      'Court map with 0 shots, none selected. Approximate positions.',
    );
    expect(wrapper.classes()).toContain('is-compact');
  });

  it('emits nothing', async () => {
    const wrapper = mountMap();
    await wrapper.setProps({ selectedId: 'shot-01' });
    expect(Object.keys(wrapper.emitted())).toEqual([]);
  });
});
