// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ShotMediaViewer from './ShotMediaViewer.vue';
import { demoSession, getShot, type Shot } from '../domain/session';

const shot8 = getShot(demoSession, 'shot-08');
const shot1 = getShot(demoSession, 'shot-01');

function mountViewer(shot: Shot | null) {
  return mount(ShotMediaViewer, { props: { shot, session: demoSession } });
}

describe('ShotMediaViewer', () => {
  it('shows the empty state when no shot is selected', () => {
    const wrapper = mountViewer(null);
    expect(wrapper.text()).toContain('Select a shot to review');
    expect(wrapper.find('video').exists()).toBe(false);
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.find('[data-test="outcome"]').exists()).toBe(false);
  });

  it('renders an honest placeholder for a shot without media', () => {
    const wrapper = mountViewer(shot8);
    expect(wrapper.find('video').exists()).toBe(false);
    expect(wrapper.find('img').exists()).toBe(false);
    const placeholder = wrapper.find('[data-test="placeholder"]');
    expect(placeholder.text()).toContain('Video not captured for this shot');
    expect(placeholder.text()).toContain('Shot 8 · Backhand · 2:21');
    expect(placeholder.text()).toContain('Off balance on recovery');
    expect(wrapper.text()).not.toMatch(/CAM 0|telemetry|trace/i);
  });

  it('renders the summary line and outcome chip', () => {
    const wrapper = mountViewer(shot8);
    expect(wrapper.find('[data-test="summary"]').text()).toBe('Shot 8 · Backhand · 2:21');
    const chip = wrapper.find('[data-test="outcome"]');
    expect(chip.text()).toBe('Off balance on recovery');
    expect(chip.classes()).toContain('is-issue');

    const clean = mountViewer(shot1);
    expect(clean.find('[data-test="summary"]').text()).toBe('Shot 1 · Backhand · 0:18');
    expect(clean.find('[data-test="outcome"]').classes()).toContain('is-strong');
  });

  it('renders a video with controls and poster when a clip exists', () => {
    const shot: Shot = {
      ...shot8,
      media: { clipUrl: '/clips/shot-08.mp4', posterUrl: '/clips/shot-08.jpg' },
    };
    const wrapper = mountViewer(shot);
    const video = wrapper.find('video');
    expect(video.exists()).toBe(true);
    expect(video.attributes('src')).toBe('/clips/shot-08.mp4');
    expect(video.attributes('poster')).toBe('/clips/shot-08.jpg');
    expect(video.attributes('controls')).toBeDefined();
    expect(video.attributes('playsinline')).toBeDefined();
    expect(video.attributes('preload')).toBe('metadata');
    expect(video.attributes('aria-label')).toBe(
      'Video of Shot 8 backhand from Backhand recovery session',
    );
    expect(wrapper.find('[data-test="placeholder"]').exists()).toBe(false);
  });

  it('renders a key frame image when only a poster exists', () => {
    const shot: Shot = { ...shot8, media: { posterUrl: '/clips/shot-08.jpg' } };
    const wrapper = mountViewer(shot);
    expect(wrapper.find('video').exists()).toBe(false);
    const img = wrapper.find('img');
    expect(img.attributes('src')).toBe('/clips/shot-08.jpg');
    expect(img.attributes('alt')).toBe('Key frame of Shot 8 backhand from Backhand recovery session');
  });

  it('emits nothing', async () => {
    const wrapper = mountViewer(shot8);
    await wrapper.setProps({ shot: null });
    expect(Object.keys(wrapper.emitted())).toEqual([]);
  });
});
