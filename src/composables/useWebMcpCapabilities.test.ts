// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { resolveModelContext } from './useWebMcpCapabilities';

const fake = { registerTool: async () => {} };

function setSurface(target: object, value: unknown) {
  Object.defineProperty(target, 'modelContext', { value, configurable: true, writable: true });
}

afterEach(() => {
  delete (navigator as { modelContext?: unknown }).modelContext;
  delete (document as { modelContext?: unknown }).modelContext;
});

describe('resolveModelContext', () => {
  it('prefers the spec surface navigator.modelContext', () => {
    setSurface(navigator, fake);
    setSurface(document, { registerTool: async () => {} });
    expect(resolveModelContext()).toEqual({ context: fake, surface: 'navigator.modelContext' });
  });

  it('falls back to document.modelContext polyfills', () => {
    setSurface(document, fake);
    expect(resolveModelContext()).toEqual({ context: fake, surface: 'document.modelContext' });
  });

  it('ignores objects without registerTool and reports unsupported', () => {
    setSurface(navigator, { getTools: () => [] });
    expect(resolveModelContext()).toEqual({ context: null, surface: null });
  });
});
