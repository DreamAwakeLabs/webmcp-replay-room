// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SessionShotRail from './SessionShotRail.vue';
import { demoSession, type Shot } from '../domain/session';

const shots = demoSession.shots;

interface RailProps {
  shots: Shot[];
  displayedShots: Shot[];
  selectedId: string | null;
  coachSubset: boolean;
  durationMinutes?: number;
}

function mountRail(overrides: Partial<RailProps> = {}) {
  return mount(SessionShotRail, {
    props: {
      shots,
      displayedShots: shots,
      selectedId: null,
      coachSubset: false,
      ...overrides,
    },
  });
}

type Rail = ReturnType<typeof mountRail>;

function rows(wrapper: Rail) {
  return wrapper.findAll('[aria-label="Session shots"] button.row');
}

async function clickFilter(wrapper: Rail, label: string) {
  const chip = wrapper.findAll('.filter').find((b) => b.text() === label)!;
  await chip.trigger('click');
}

describe('SessionShotRail', () => {
  it('renders the heading with count, duration and one row per shot', () => {
    const wrapper = mountRail({ durationMinutes: demoSession.durationMinutes });
    expect(wrapper.find('h2').text()).toBe('Shots');
    expect(wrapper.find('.summary').text()).toBe('12 shots · 18 min of play');
    expect(rows(wrapper)).toHaveLength(12);

    const first = rows(wrapper)[0]!;
    expect(first.find('.number').text()).toBe('01');
    expect(first.find('.title').text()).toBe('Backhand');
    expect(first.find('.outcome').text()).toBe('Clean contact');
    expect(first.find('.time').text()).toBe('0:18');
    expect(first.find('img').exists()).toBe(false);
  });

  it('derives the duration from the last shot when durationMinutes is absent', () => {
    const wrapper = mountRail();
    expect(wrapper.find('.summary').text()).toBe('12 shots · 4 min of play');
  });

  it('marks problem shots with a text label, not only color', () => {
    const wrapper = mountRail();
    const problem = rows(wrapper)[2]!;
    expect(problem.find('.outcome').text()).toContain('Off balance on recovery');
    expect(problem.find('.sr-only').text()).toBe('Issue:');
    expect(problem.find('.issue-mark').exists()).toBe(true);
    expect(rows(wrapper)[0]!.find('.issue-mark').exists()).toBe(false);
  });

  it('shows a thumbnail only when a poster exists', () => {
    const withMedia: Shot = { ...shots[0]!, media: { posterUrl: '/frames/shot-01.jpg' } };
    const pair = [withMedia, shots[1]!];
    const wrapper = mountRail({ shots: pair, displayedShots: pair });
    const img = rows(wrapper)[0]!.find('img');
    expect(img.attributes('src')).toBe('/frames/shot-01.jpg');
    expect(img.attributes('alt')).toBe('Shot 1');
    expect(rows(wrapper)[1]!.find('img').exists()).toBe(false);
  });

  it('sets aria-current on the selected row', () => {
    const wrapper = mountRail({ selectedId: 'shot-03' });
    const current = wrapper.findAll('[aria-current="true"]');
    expect(current).toHaveLength(1);
    expect(current[0]!.find('.number').text()).toBe('03');
  });

  it('emits select with the shot id when a row is clicked', async () => {
    const wrapper = mountRail();
    await rows(wrapper)[7]!.trigger('click');
    expect(wrapper.emitted('select')).toEqual([['shot-08']]);
  });

  it('filters by stroke, issues and best on top of the displayed shots', async () => {
    const wrapper = mountRail();

    await clickFilter(wrapper, 'Backhands');
    expect(rows(wrapper)).toHaveLength(7);
    expect(rows(wrapper).every((r) => r.find('.title').text() === 'Backhand')).toBe(true);

    await clickFilter(wrapper, 'Forehands');
    expect(rows(wrapper)).toHaveLength(3);

    await clickFilter(wrapper, 'Serves');
    expect(rows(wrapper)).toHaveLength(2);

    await clickFilter(wrapper, 'Issues');
    expect(rows(wrapper).map((r) => r.find('.number').text())).toEqual(['03', '04', '07', '08', '10', '11']);

    await clickFilter(wrapper, 'Best');
    expect(rows(wrapper).map((r) => r.find('.number').text())).toEqual(['01', '02', '06', '09', '12']);

    await clickFilter(wrapper, 'All');
    expect(rows(wrapper)).toHaveLength(12);
    expect(wrapper.find('.filter[aria-pressed="true"]').text()).toBe('All');
  });

  it('applies filters to the coach subset and offers Show all', async () => {
    const subset = shots.filter((s) => ['shot-03', 'shot-08', 'shot-11', 'shot-06'].includes(s.id));
    const wrapper = mountRail({ displayedShots: subset, coachSubset: true });
    expect(wrapper.find('.coach-bar').text()).toContain('Coach is showing 4 shots');
    expect(rows(wrapper)).toHaveLength(4);

    await clickFilter(wrapper, 'Issues');
    expect(rows(wrapper)).toHaveLength(3);

    await wrapper.find('.coach-bar button').trigger('click');
    expect(wrapper.emitted('show-all')).toEqual([[]]);
  });

  it('hides the coach bar when the whole session is shown', () => {
    const wrapper = mountRail();
    expect(wrapper.find('.coach-bar').exists()).toBe(false);
  });

  it('renders honest empty states', async () => {
    const empty = mountRail({ shots: [], displayedShots: [] });
    expect(empty.find('.summary').text()).toBe('0 shots');
    expect(empty.find('.empty').text()).toBe('No shots in this session yet.');

    const noSubset = mountRail({ displayedShots: [], coachSubset: true });
    expect(noSubset.find('.empty').text()).toBe('Coach has no shots to show right now.');

    const filtered = mountRail({ displayedShots: [shots[0]!] });
    await clickFilter(filtered, 'Serves');
    expect(filtered.find('.empty').text()).toBe('No shots match this filter.');
  });

  it('never shows system vocabulary', () => {
    const text = mountRail({ coachSubset: true, displayedShots: shots.slice(0, 3) }).text();
    for (const word of ['WebMCP', 'capability', 'tool', 'agent', 'JSON', 'effect']) {
      expect(text).not.toContain(word);
    }
  });
});
