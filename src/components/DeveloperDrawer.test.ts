// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import DeveloperDrawer from './DeveloperDrawer.vue';
import { demoSession } from '../domain/session';

const capabilities = [
  { id: 'get_current_shot', title: 'Get current shot', effect: 'read' },
  { id: 'find_similar_shots', title: 'Find similar shots', effect: 'read' },
  { id: 'set_next_session_focus', title: 'Set next-session focus', effect: 'reversible-write' },
];

const activity = [
  'Coach highlighted Balance through contact.',
  'Loaded "Backhand recovery session" with 12 shots.',
];

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    open: true,
    webMcp: {
      supported: true,
      surface: 'document.modelContext',
      registered: ['get_current_shot', 'find_similar_shots'],
      unavailable: [{ id: 'set_next_session_focus', reason: 'schema rejected' }],
      error: null,
    },
    capabilities,
    sessionId: demoSession.id,
    sessionSource: 'Bundled demo',
    activity,
    ...overrides,
  };
}

describe('DeveloperDrawer', () => {
  it('renders nothing when closed', () => {
    const wrapper = mount(DeveloperDrawer, { props: baseProps({ open: false }) });
    expect(wrapper.find('aside').exists()).toBe(false);
  });

  it('shows status rows, capabilities and activity when open', () => {
    const wrapper = mount(DeveloperDrawer, { props: baseProps() });
    const aside = wrapper.find('aside[role="complementary"]');
    expect(aside.attributes('aria-label')).toBe('Developer');
    const text = aside.text();
    expect(text).toContain('Ready');
    expect(text).toContain('document.modelContext');
    expect(text).toContain('2/3 registered');
    expect(text).toContain(demoSession.id);
    expect(text).toContain('Bundled demo');

    const rows = wrapper.findAll('.capability');
    expect(rows).toHaveLength(3);
    expect(rows[0]!.classes()).toContain('is-registered');
    expect(rows[0]!.find('code').text()).toBe('get_current_shot');
    expect(rows[0]!.text()).toContain('read');
    expect(rows[2]!.classes()).not.toContain('is-registered');
    expect(rows[2]!.text()).toContain('reversible-write');
    expect(rows[2]!.text()).toContain('schema rejected');

    expect(wrapper.findAll('.activity-list li').map((li) => li.text())).toEqual(activity);
    expect(wrapper.find('.error-copy').exists()).toBe(false);
  });

  it('shows Unavailable and the raw error', () => {
    const wrapper = mount(DeveloperDrawer, {
      props: baseProps({
        webMcp: {
          supported: false,
          surface: null,
          registered: [],
          unavailable: [],
          error: 'modelContext missing',
        },
        activity: [],
      }),
    });
    expect(wrapper.text()).toContain('Unavailable');
    expect(wrapper.text()).toContain('0/3 registered');
    expect(wrapper.find('.error-copy').text()).toContain('modelContext missing');
    expect(wrapper.text()).toContain('No activity yet.');
  });

  it('emits close from the button and from Escape', async () => {
    const wrapper = mount(DeveloperDrawer, { props: baseProps(), attachTo: document.body });
    await wrapper.find('.close-button').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(wrapper.emitted('close')).toHaveLength(2);
    wrapper.unmount();
  });

  it('ignores an Escape another control already handled', () => {
    const wrapper = mount(DeveloperDrawer, { props: baseProps(), attachTo: document.body });
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    event.preventDefault();
    document.dispatchEvent(event);
    expect(wrapper.emitted('close')).toBeUndefined();
    wrapper.unmount();
  });

  it('moves focus in on open and back to the opener on close', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const wrapper = mount(DeveloperDrawer, { props: baseProps({ open: false }), attachTo: document.body });

    await wrapper.setProps({ open: true });
    expect(document.activeElement).toBe(wrapper.find('.close-button').element);

    await wrapper.setProps({ open: false });
    expect(document.activeElement).toBe(opener);
    wrapper.unmount();
    opener.remove();
  });

  it('ignores Escape while closed', () => {
    const wrapper = mount(DeveloperDrawer, { props: baseProps({ open: false }), attachTo: document.body });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(wrapper.emitted('close')).toBeUndefined();
    wrapper.unmount();
  });
});
