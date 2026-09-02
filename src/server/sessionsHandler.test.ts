import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoSession } from '../domain/session';
import handler, { type SessionsRequest, type SessionsResponse } from './sessionsHandler';

const { putMock, headMock } = vi.hoisted(() => ({
  putMock: vi.fn(),
  headMock: vi.fn(),
}));

vi.mock('@vercel/blob', () => ({ put: putMock, head: headMock }));

function makeRequest(overrides: Partial<SessionsRequest> = {}): SessionsRequest {
  return { method: 'GET', query: {}, headers: {}, ...overrides };
}

function makeResponse() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      res.statusCode = code;
      return res as unknown as SessionsResponse;
    },
    setHeader(name: string, value: string) {
      res.headers[name] = value;
    },
    json(body: unknown) {
      res.body = body;
    },
  };
  return res;
}

beforeEach(() => {
  vi.stubEnv('REPLAY_PUSH_TOKEN', 'secret-token');
  putMock.mockReset().mockResolvedValue({ url: 'https://blob.test/sessions/x.json' });
  headMock.mockReset().mockResolvedValue({ url: 'https://blob.test/sessions/x.json' });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('POST /api/sessions', () => {
  it('stores a valid session and returns the viewer path', async () => {
    const res = makeResponse();
    await handler(makeRequest({
      method: 'POST',
      headers: { 'x-replay-token': 'secret-token' },
      body: demoSession,
    }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      id: demoSession.id,
      shots: demoSession.shots.length,
      viewerPath: `/?session=${encodeURIComponent(demoSession.id)}`,
    });
    expect(putMock).toHaveBeenCalledWith(
      `sessions/${demoSession.id}.json`,
      JSON.stringify(demoSession),
      expect.objectContaining({ access: 'public', addRandomSuffix: false, allowOverwrite: true }),
    );
  });

  it('rejects a wrong or missing token without touching the store', async () => {
    for (const headers of [{}, { 'x-replay-token': 'wrong' }]) {
      const res = makeResponse();
      await handler(makeRequest({ method: 'POST', headers, body: demoSession }), res);
      expect(res.statusCode).toBe(401);
    }
    expect(putMock).not.toHaveBeenCalled();
  });

  it('is disabled entirely when REPLAY_PUSH_TOKEN is unset', async () => {
    vi.stubEnv('REPLAY_PUSH_TOKEN', '');
    const res = makeResponse();
    await handler(makeRequest({
      method: 'POST',
      headers: { 'x-replay-token': '' },
      body: demoSession,
    }), res);
    expect(res.statusCode).toBe(503);
  });

  it('rejects an invalid session body with the parse reason', async () => {
    const res = makeResponse();
    await handler(makeRequest({
      method: 'POST',
      headers: { 'x-replay-token': 'secret-token' },
      body: { id: 'x' },
    }), res);
    expect(res.statusCode).toBe(400);
    expect((res.body as { error: string }).error).toContain('session.shots');
  });
});

describe('GET /api/sessions', () => {
  it('returns the stored session JSON same-origin', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(demoSession)),
    ));
    const res = makeResponse();
    await handler(makeRequest({ query: { id: demoSession.id } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(demoSession);
    expect(headMock).toHaveBeenCalledWith(`sessions/${demoSession.id}.json`);
  });

  it('404s an unknown id and 400s a missing/invalid one', async () => {
    headMock.mockRejectedValue(new Error('not found'));
    const missing = makeResponse();
    await handler(makeRequest({ query: { id: 'nope' } }), missing);
    expect(missing.statusCode).toBe(404);

    const invalid = makeResponse();
    await handler(makeRequest({ query: { id: '../etc' } }), invalid);
    expect(invalid.statusCode).toBe(400);

    const absent = makeResponse();
    await handler(makeRequest({ query: {} }), absent);
    expect(absent.statusCode).toBe(400);
  });
});

describe('other methods', () => {
  it('rejects non-GET/POST', async () => {
    const res = makeResponse();
    await handler(makeRequest({ method: 'DELETE' }), res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.allow).toBe('GET, POST');
  });
});
