// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App.vue';
import { METRIC_LABELS } from './domain/coaching';
import { demoSession } from './domain/session';

function pushedSession() {
  const session = JSON.parse(JSON.stringify(demoSession));
  session.id = 'tennisbot-20260706';
  session.title = 'Tennisbot session 2026-07-06';
  return session;
}

function setSearch(search: string) {
  window.history.replaceState(null, '', `/${search}`);
}

async function mountApp() {
  const wrapper = mount(App, { attachTo: document.body });
  await flushPromises();
  return wrapper;
}

function buttonByText(wrapper: ReturnType<typeof mount>, text: string) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text().trim() === text);
  if (!button) {
    throw new Error(`No button with text "${text}"`);
  }
  return button;
}

afterEach(() => {
  vi.unstubAllGlobals();
  setSearch('');
  document.body.innerHTML = '';
});

describe('App session loading', () => {
  it('loads the ?session= fixture and replaces the demo', async () => {
    const session = pushedSession();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(session)),
    );
    vi.stubGlobal('fetch', fetchMock);
    setSearch('?session=tennisbot-20260706');

    const wrapper = await mountApp();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/sessions?id=tennisbot-20260706',
      expect.anything(),
    );
    expect(wrapper.text()).toContain(session.title);
    expect(wrapper.text()).toContain(`${session.shots.length} shots`);
    expect(wrapper.find('.session-notice').exists()).toBe(false);
    wrapper.unmount();
  });

  it('falls back to the demo session with a notice when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('gone', { status: 404 }),
    ));
    setSearch('?session=missing-session');

    const wrapper = await mountApp();

    expect(wrapper.text()).toContain(demoSession.title);
    const notice = wrapper.find('.session-notice');
    expect(notice.attributes('role')).toBe('alert');
    expect(notice.text()).toContain(
      "We couldn't load that practice session. Showing the demo session instead.",
    );
    expect(notice.find('code').exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows the demo session untouched without a ?session= param', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const wrapper = await mountApp();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain(demoSession.title);
    wrapper.unmount();
  });
});

describe('App player mode', () => {
  it('shows coaching language only by default', async () => {
    const wrapper = await mountApp();
    const text = wrapper.text();

    expect(text).not.toMatch(/WebMCP/);
    expect(text).not.toMatch(/capabilit/i);
    expect(text).not.toMatch(/JSON/);
    expect(text).not.toMatch(/\bagent\b/i);
    expect(text).not.toContain(demoSession.id);
    expect(text).toContain('Main issue');
    expect(text).toContain('Next practice');
    expect(text).toContain('Coach update');
    expect(wrapper.find('[role="complementary"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows the share id only inside Session details', async () => {
    const wrapper = await mountApp();

    await wrapper.find('[data-test="menu-trigger"]').trigger('click');
    await wrapper.find('[data-test="menu-details"]').trigger('click');

    const details = wrapper.find('.details');
    expect(details.text()).toContain('Share id');
    expect(details.text()).toContain(demoSession.id);
    wrapper.unmount();
  });
});

describe('App modes', () => {
  it('?debug=1 opens the developer drawer with the tool list and surface state', async () => {
    setSearch('?debug=1');
    const wrapper = await mountApp();

    const drawer = wrapper.find('[role="complementary"]');
    expect(drawer.exists()).toBe(true);
    expect(drawer.text()).toContain('get_current_shot');
    expect(drawer.text()).toContain('Unavailable');
    expect(drawer.text()).toContain('Surface');
    expect(drawer.text()).toContain('none');
    expect(wrapper.find('[data-test="mode-badge"]').text()).toBe('Developer mode');
    wrapper.unmount();
  });

  it('?mode=analysis shows every metric label with a number', async () => {
    setSearch('?mode=analysis');
    const wrapper = await mountApp();
    const text = wrapper.text();

    for (const label of Object.values(METRIC_LABELS)) {
      expect(text).toContain(label);
    }
    expect(wrapper.find('[data-test="mode-badge"]').text()).toBe('Analysis mode');
    expect(wrapper.find('[role="complementary"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('switching modes from the header rewrites the URL', async () => {
    const wrapper = await mountApp();

    await wrapper.find('[data-test="menu-trigger"]').trigger('click');
    await wrapper.find('[data-test="menu-mode-analysis"]').trigger('click');

    expect(window.location.search).toBe('?mode=analysis');
    expect(wrapper.find('[data-test="mode-badge"]').text()).toBe('Analysis mode');
    wrapper.unmount();
  });
});

describe('App similar shots and comparison', () => {
  it('Find similar shots fills the strip and Show all clears it', async () => {
    const wrapper = await mountApp();

    await buttonByText(wrapper, 'Find similar shots').trigger('click');

    const strip = wrapper.find('.strip');
    expect(strip.text()).toContain('Similar shots');
    expect(strip.findAll('.card').length).toBe(3);
    expect(wrapper.find('.coach-bar').text()).toContain('Showing 4 shots');
    expect(wrapper.find('[data-test="similar-chip"]').text()).toBe('3 similar shots');

    await wrapper.find('.coach-bar button').trigger('click');

    expect(wrapper.find('.coach-bar').exists()).toBe(false);
    expect(wrapper.find('.strip').findAll('.card').length).toBe(0);
    expect(wrapper.find('[data-test="similar-chip"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('removing a shot from the strip narrows the shared set', async () => {
    const wrapper = await mountApp();

    await buttonByText(wrapper, 'Find similar shots').trigger('click');
    await wrapper.find('.strip .remove').trigger('click');

    expect(wrapper.find('.strip').findAll('.card').length).toBe(2);
    expect(wrapper.find('.coach-bar').text()).toContain('Showing 3 shots');
    wrapper.unmount();
  });

  it('Compare to best explains the biggest difference and can be cleared', async () => {
    const wrapper = await mountApp();

    await wrapper.find('.compare button.primary').trigger('click');

    const panel = wrapper.find('.compare');
    expect(panel.text()).toContain('Biggest difference');
    expect(panel.text()).toContain('Your best shots');
    expect(wrapper.find('.coach-update').text()).toContain('biggest difference');

    await buttonByText(wrapper, 'Clear comparison').trigger('click');

    expect(wrapper.find('.compare').text()).not.toContain('Biggest difference');
    wrapper.unmount();
  });

  it('Make this my next focus saves the primary metric to the plan', async () => {
    const wrapper = await mountApp();

    await buttonByText(wrapper, 'Make this my next focus').trigger('click');

    expect(wrapper.find('.next-session').text()).toContain('Suggested drill');
    expect(wrapper.find('[data-test="focus"]').text()).toContain('Main focus:');
    expect(wrapper.find('.coach-update').text()).toContain('saved as your next-practice focus');
    wrapper.unmount();
  });
});

describe('App court panel', () => {
  it('never renders the court in Player mode', async () => {
    const wrapper = await mountApp();

    expect(wrapper.find('.court-map').exists()).toBe(false);
    wrapper.unmount();
  });

  it('renders the mini-map in Analysis mode with the approximate caption when positions are unflagged', async () => {
    setSearch('?mode=analysis');
    const wrapper = await mountApp();

    expect(wrapper.find('.court-map').exists()).toBe(true);
    expect(wrapper.text()).toContain('Approximate positions');
    expect(wrapper.text()).not.toContain('Illustrative placement');
    wrapper.unmount();
  });

  it('labels synthetic court positions as illustrative', async () => {
    const session = pushedSession();
    session.courtPositions = 'synthetic';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(session))));
    setSearch('?session=tennisbot-20260706&mode=analysis');
    const wrapper = await mountApp();

    expect(wrapper.find('.court-map.is-illustrative').exists()).toBe(true);
    expect(wrapper.text()).toContain('Illustrative placement, court position not tracked');
    expect(wrapper.text()).not.toContain('Approximate positions');
    wrapper.unmount();
  });
});
