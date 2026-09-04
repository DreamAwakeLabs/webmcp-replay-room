// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SimilarShotsStrip from './SimilarShotsStrip.vue';
import { demoSession, getShot, type Shot } from '../domain/session';

const similar: Shot[] = ['shot-03', 'shot-08', 'shot-11'].map((id) => getShot(demoSession, id));

function mountStrip(overrides: Partial<InstanceType<typeof SimilarShotsStrip>['$props']> = {}) {
  return mount(SimilarShotsStrip, {
    props: {
      shots: similar,
      selectedId: 'shot-08',
      title: 'Similar mistakes',
      removable: true,
      ...overrides,
    },
  });
}

describe('SimilarShotsStrip', () => {
  it('renders a card per shot with number, stroke, time and issue', () => {
    const wrapper = mountStrip();
    const cards = wrapper.findAll('li.card');
    expect(cards).toHaveLength(3);

    const first = cards[0]!;
    expect(first.text()).toContain('Shot 3');
    expect(first.text()).toContain('Backhand');
    expect(first.text()).toContain('0:48');
    expect(first.text()).toContain('Lost balance through contact');
    expect(first.find('img').exists()).toBe(false);
    expect(first.find('.thumb-empty').text()).toBe('Backhand');

    expect(cards[1]!.classes()).toContain('is-selected');
    expect(cards[1]!.find('button.card-body').attributes('aria-pressed')).toBe('true');
    expect(wrapper.text()).toContain('Similar mistakes');
    expect(wrapper.text()).toContain('3 shots');
    expect(wrapper.text()).not.toContain('Match #');
  });

  it('shows a poster image when media is present and a similarity rank on request', () => {
    const withMedia: Shot = { ...similar[0]!, media: { posterUrl: '/posters/shot-03.jpg' } };
    const wrapper = mountStrip({ shots: [withMedia], showSimilarity: true });
    const img = wrapper.find('img.thumb');
    expect(img.attributes('src')).toBe('/posters/shot-03.jpg');
    expect(wrapper.text()).toContain('Match #1');
  });

  it('emits select with the shot id when a card is clicked', async () => {
    const wrapper = mountStrip();
    await wrapper.findAll('button.card-body')[2]!.trigger('click');
    expect(wrapper.emitted('select')).toEqual([['shot-11']]);
  });

  it('emits remove from a separate labelled control only when removable', async () => {
    const wrapper = mountStrip();
    const remove = wrapper.find('button[aria-label="Remove shot 3 from this set"]');
    expect(remove.exists()).toBe(true);
    await remove.trigger('click');
    expect(wrapper.emitted('remove')).toEqual([['shot-03']]);
    expect(wrapper.emitted('select')).toBeUndefined();

    const fixed = mountStrip({ removable: false });
    expect(fixed.find('button.remove').exists()).toBe(false);
  });

  it('emits compare from the Compare to best button', async () => {
    const wrapper = mountStrip();
    const button = wrapper.findAll('button').find((b) => b.text() === 'Compare to best');
    expect(button).toBeDefined();
    await button!.trigger('click');
    expect(wrapper.emitted('compare')).toEqual([[]]);
  });

  it('shows the empty state without cards or compare button', () => {
    const wrapper = mountStrip({ shots: [], selectedId: null });
    expect(wrapper.text()).toContain(
      'Pick a shot and choose Find similar shots to see the same mistake elsewhere.',
    );
    expect(wrapper.findAll('li.card')).toHaveLength(0);
    expect(wrapper.text()).not.toContain('Compare to best');
  });
});
