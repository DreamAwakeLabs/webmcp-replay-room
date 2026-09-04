// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { adaptModelContext, resolveModelContext } from './useWebMcpCapabilities';

const fake = { registerTool: async () => {} };

function setSurface(target: object, value: unknown) {
  Object.defineProperty(target, 'modelContext', { value, configurable: true, writable: true });
}

afterEach(() => {
  delete (navigator as { modelContext?: unknown }).modelContext;
  delete (document as { modelContext?: unknown }).modelContext;
});

describe('resolveModelContext', () => {
  it('prefers the spec surface document.modelContext (Chrome 150+)', () => {
    setSurface(document, fake);
    setSurface(navigator, { registerTool: async () => {} });
    expect(resolveModelContext()).toEqual({ context: fake, surface: 'document.modelContext' });
  });

  it('falls back to the legacy navigator.modelContext (Chrome 149)', () => {
    setSurface(navigator, fake);
    expect(resolveModelContext()).toEqual({ context: fake, surface: 'navigator.modelContext' });
  });

  it('ignores objects without registerTool and reports unsupported', () => {
    setSurface(navigator, { getTools: () => [] });
    expect(resolveModelContext()).toEqual({ context: null, surface: null });
  });
});

describe('adaptModelContext', () => {
  function capture() {
    let registered: any;
    const context = { registerTool: async (tool: any) => { registered = tool; } };
    return { context, registered: () => registered };
  }

  it('supplies an options object with an AbortSignal when Chrome passes only input', async () => {
    const seen: unknown[] = [];
    const { context, registered } = capture();
    await adaptModelContext(context).registerTool({
      name: 'x', description: 'x', inputSchema: {}, annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input, options) => { seen.push(input, options); return 'ok'; },
    });
    expect(await registered().execute({ limit: 2 })).toBe('ok');
    expect(seen[0]).toEqual({ limit: 2 });
    expect((seen[1] as { signal: unknown }).signal).toBeInstanceOf(AbortSignal);
  });

  it('parses JSON-string input and passes a provided signal through', async () => {
    const seen: unknown[] = [];
    const { context, registered } = capture();
    await adaptModelContext(context).registerTool({
      name: 'x', description: 'x', inputSchema: {}, annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input, options) => { seen.push(input, options); return 'ok'; },
    });
    const signal = new AbortController().signal;
    await registered().execute('{"limit":4}', { signal });
    expect(seen).toEqual([{ limit: 4 }, { signal }]);
  });
});
