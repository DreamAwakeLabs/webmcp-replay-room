// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App.vue';
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

afterEach(() => {
  vi.unstubAllGlobals();
  setSearch('');
});

describe('App session loading', () => {
  it('loads the ?session= fixture and replaces the demo', async () => {
    const session = pushedSession();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(session)),
    );
    vi.stubGlobal('fetch', fetchMock);
    setSearch('?session=tennisbot-20260706');

    const wrapper = mount(App);
    await flushPromises();

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

    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.text()).toContain(demoSession.title);
    expect(wrapper.find('.session-notice').text()).toContain('showing the demo');
    wrapper.unmount();
  });

  it('shows the demo session untouched without a ?session= param', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const wrapper = mount(App);
    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain(demoSession.title);
    wrapper.unmount();
  });
});
