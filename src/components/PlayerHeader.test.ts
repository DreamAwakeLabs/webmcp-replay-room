// @vitest-environment happy-dom
import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import PlayerHeader from './PlayerHeader.vue';
import { demoSession, type MetricName, type TennisSession } from '../domain/session';
import type { ViewMode } from '../state/viewMode';

type Props = {
  session: TennisSession;
  focus: MetricName | null;
  similarCount: number;
  mode: ViewMode;
  webMcpReady: boolean;
};

let wrapper: VueWrapper | null = null;

function mountHeader(overrides: Partial<Props> = {}) {
  wrapper = mount(PlayerHeader, {
    attachTo: document.body,
    props: {
      session: demoSession,
      focus: null,
      similarCount: 0,
      mode: 'player',
      webMcpReady: false,
      ...overrides,
    },
  });
  return wrapper;
}

async function openMenu(w: VueWrapper) {
  await w.get('[data-test="menu-trigger"]').trigger('click');
  return w.get('[role="menu"]');
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe('PlayerHeader rendering', () => {
  it('shows brand, session title, date and the focus label', () => {
    const w = mountHeader({ focus: 'recovery', similarCount: 3 });
    expect(w.text()).toContain('Replay Room');
    expect(w.get('[data-test="session-title"]').text()).toContain(demoSession.title);
    expect(w.get('[data-test="session-title"]').text()).toContain(demoSession.dateLabel);
    expect(w.get('[data-test="focus"]').text()).toBe('Main focus: Recovery after contact');
    expect(w.get('[data-test="similar-chip"]').text()).toBe('3 similar shots');
  });

  it('renders the empty state: no focus, no similar chip, no mode badge, no coach status', () => {
    const empty: TennisSession = { ...demoSession, shots: [] };
    const w = mountHeader({ session: empty });
    expect(w.get('[data-test="focus"]').text()).toBe('No focus set yet');
    expect(w.find('[data-test="similar-chip"]').exists()).toBe(false);
    expect(w.find('[data-test="mode-badge"]').exists()).toBe(false);
    expect(w.find('[data-test="coach-status"]').exists()).toBe(false);
    expect(w.text()).not.toMatch(/WebMCP|capability|tool|agent|protocol|JSON/i);
  });

  it('uses the singular chip for one similar shot', () => {
    const w = mountHeader({ similarCount: 1 });
    expect(w.get('[data-test="similar-chip"]').text()).toBe('1 similar shot');
  });

  it('shows a mode badge outside Player mode and coach status only in Developer mode', async () => {
    const w = mountHeader({ mode: 'analysis' });
    expect(w.get('[data-test="mode-badge"]').text()).toBe('Analysis mode');
    expect(w.find('[data-test="coach-status"]').exists()).toBe(false);

    await w.setProps({ mode: 'developer', webMcpReady: true });
    expect(w.get('[data-test="mode-badge"]').text()).toBe('Developer mode');
    expect(w.get('[data-test="coach-status"]').text()).toBe('Coach connected');

    await w.setProps({ webMcpReady: false });
    expect(w.get('[data-test="coach-status"]').text()).toBe('Coach offline');
    expect(w.text()).not.toContain('WebMCP');
  });
});

describe('PlayerHeader overflow menu', () => {
  it('has the accessible trigger attributes and opens with focus on the first item', async () => {
    const w = mountHeader();
    const trigger = w.get('[data-test="menu-trigger"]');
    expect(trigger.attributes('aria-label')).toBe('More options');
    expect(trigger.attributes('aria-haspopup')).toBe('menu');
    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(w.find('[role="menu"]').exists()).toBe(false);

    await openMenu(w);
    expect(trigger.attributes('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(w.get('[data-test="menu-import"]').element);
  });

  it('lists the actions then the mode group with aria-checked on the current mode', async () => {
    const w = mountHeader({ mode: 'analysis' });
    const menu = await openMenu(w);
    const labels = menu.findAll('[role^="menuitem"]').map((item) => item.text().replace(/^✓\s*/, ''));
    expect(labels).toEqual([
      'Import session…',
      'Copy session link',
      'Session details',
      'Player mode',
      'Analysis mode',
      'Developer mode',
    ]);
    expect(w.get('[data-test="menu-mode-player"]').attributes('aria-checked')).toBe('false');
    expect(w.get('[data-test="menu-mode-analysis"]').attributes('aria-checked')).toBe('true');
    expect(w.get('[data-test="menu-mode-developer"]').attributes('aria-checked')).toBe('false');
  });

  it('emits import, copy-link and details and closes after each', async () => {
    const w = mountHeader();

    await openMenu(w);
    await w.get('[data-test="menu-import"]').trigger('click');
    expect(w.emitted('import')).toHaveLength(1);
    expect(w.find('[role="menu"]').exists()).toBe(false);

    await openMenu(w);
    await w.get('[data-test="menu-copy-link"]').trigger('click');
    expect(w.emitted('copy-link')).toHaveLength(1);
    expect(w.find('[role="menu"]').exists()).toBe(false);

    await openMenu(w);
    await w.get('[data-test="menu-details"]').trigger('click');
    expect(w.emitted('details')).toHaveLength(1);
    expect(w.find('[role="menu"]').exists()).toBe(false);
  });

  it('emits set-mode with the chosen mode, but not for the current mode', async () => {
    const w = mountHeader({ mode: 'player' });

    await openMenu(w);
    await w.get('[data-test="menu-mode-developer"]').trigger('click');
    expect(w.emitted('set-mode')).toEqual([['developer']]);
    expect(w.find('[role="menu"]').exists()).toBe(false);

    await openMenu(w);
    await w.get('[data-test="menu-mode-player"]').trigger('click');
    expect(w.emitted('set-mode')).toEqual([['developer']]);
  });

  it('moves focus with arrow keys and wraps', async () => {
    const w = mountHeader();
    const menu = await openMenu(w);

    await menu.trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement).toBe(w.get('[data-test="menu-copy-link"]').element);

    await menu.trigger('keydown', { key: 'ArrowUp' });
    await menu.trigger('keydown', { key: 'ArrowUp' });
    expect(document.activeElement).toBe(w.get('[data-test="menu-mode-developer"]').element);

    await menu.trigger('keydown', { key: 'End' });
    expect(document.activeElement).toBe(w.get('[data-test="menu-mode-developer"]').element);
    await menu.trigger('keydown', { key: 'Home' });
    expect(document.activeElement).toBe(w.get('[data-test="menu-import"]').element);
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const w = mountHeader();
    const menu = await openMenu(w);
    await menu.trigger('keydown', { key: 'Escape' });
    expect(w.find('[role="menu"]').exists()).toBe(false);
    expect(w.get('[data-test="menu-trigger"]').attributes('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(w.get('[data-test="menu-trigger"]').element);
  });

  it('closes on an outside pointerdown', async () => {
    const w = mountHeader();
    await openMenu(w);
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await w.vm.$nextTick();
    expect(w.find('[role="menu"]').exists()).toBe(false);
    outside.remove();
  });

  it('stays open on a pointerdown inside the menu', async () => {
    const w = mountHeader();
    const menu = await openMenu(w);
    menu.element.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await w.vm.$nextTick();
    expect(w.find('[role="menu"]').exists()).toBe(true);
  });
});
