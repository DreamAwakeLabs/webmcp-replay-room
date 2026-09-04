import { describe, expect, it } from 'vitest';
import { demoSession } from './session';
import {
  fetchSession,
  parseSession,
  readSessionParam,
  resolveSessionUrl,
  SessionParseError,
} from './sessionLoader';

function validSession() {
  return JSON.parse(JSON.stringify(demoSession)) as Record<string, unknown>;
}

describe('parseSession', () => {
  it('round-trips the demo session', () => {
    expect(parseSession(validSession())).toEqual(demoSession);
  });

  it('accepts the exporter shape (note-less shots get an empty note)', () => {
    const session = validSession();
    delete (session.shots as Record<string, unknown>[])[0]!.note;
    expect(parseSession(session).shots[0]!.note).toBe('');
  });

  it.each([
    ['not an object', 'session must be an object', 42],
    ['missing shots', 'session.shots must be an array', { id: 'x' }],
  ] as const)('rejects %s', (_label, message, data) => {
    expect(() => parseSession(data)).toThrow(message);
  });

  it.each([
    ['stroke', 'lob'],
    ['outcome', 'netted'],
  ] as const)('rejects an unknown %s', (field, value) => {
    const session = validSession();
    (session.shots as Record<string, unknown>[])[0]![field] = value;
    expect(() => parseSession(session)).toThrow(SessionParseError);
  });

  it('rejects an out-of-range metric and a missing metric', () => {
    const session = validSession();
    const shot = (session.shots as { metrics: Record<string, number> }[])[1]!;
    shot.metrics.balance = 1.4;
    expect(() => parseSession(session)).toThrow('within 0..1');
    shot.metrics.balance = 0.5;
    delete (shot.metrics as Record<string, unknown>).rotation;
    expect(() => parseSession(session)).toThrow('shots[1].metrics.rotation');
  });

  it('accepts optional shot media with http(s) URLs and relative paths', () => {
    const session = validSession();
    const shots = session.shots as Record<string, unknown>[];
    shots[0]!.media = { clipUrl: 'https://cdn.test/clip.mp4', posterUrl: '/frames/1.jpg' };
    shots[1]!.media = { posterUrl: 'frames/2.jpg' };
    shots[2]!.media = {};
    const parsed = parseSession(session);
    expect(parsed.shots[0]!.media).toEqual({
      clipUrl: 'https://cdn.test/clip.mp4',
      posterUrl: '/frames/1.jpg',
    });
    expect(parsed.shots[1]!.media).toEqual({ posterUrl: 'frames/2.jpg' });
    expect(parsed.shots[2]!.media).toEqual({});
    expect(parsed.shots[3]!.media).toBeUndefined();
  });

  it.each([
    ['javascript:alert(1)'],
    ['data:video/mp4;base64,AAAA'],
    ['blob:https://x.test/abc'],
    ['//evil.test/clip.mp4'],
    ['/\\evil.test/clip.mp4'],
    [' javascript:alert(1)'],
    [''],
    [42],
  ])('rejects the media reference %j', (value) => {
    const session = validSession();
    (session.shots as Record<string, unknown>[])[0]!.media = { clipUrl: value };
    expect(() => parseSession(session)).toThrow(SessionParseError);
  });

  it('rejects media that is not an object', () => {
    const session = validSession();
    (session.shots as Record<string, unknown>[])[0]!.media = 'clip.mp4';
    expect(() => parseSession(session)).toThrow('shots[0].media must be an object');
  });

  it.each(['measured', 'synthetic'] as const)('accepts courtPositions %s', (value) => {
    const session = validSession();
    session.courtPositions = value;
    expect(parseSession(session).courtPositions).toBe(value);
  });

  it('leaves courtPositions undefined when absent', () => {
    expect(parseSession(validSession()).courtPositions).toBeUndefined();
    expect('courtPositions' in parseSession(validSession())).toBe(false);
  });

  it.each(['estimated', '', 7, null])('rejects courtPositions %j', (value) => {
    const session = validSession();
    session.courtPositions = value;
    expect(() => parseSession(session)).toThrow(SessionParseError);
  });

  it('rejects duplicate shot ids', () => {
    const session = validSession();
    const shots = session.shots as { id: string }[];
    shots[1]!.id = shots[0]!.id;
    expect(() => parseSession(session)).toThrow('duplicate shot id');
  });
});

describe('readSessionParam', () => {
  it('reads and trims the session param', () => {
    expect(readSessionParam('?session=%20abc%20')).toBe('abc');
    expect(readSessionParam('?other=1')).toBeNull();
    expect(readSessionParam('?session=')).toBeNull();
  });
});

describe('resolveSessionUrl', () => {
  it('passes URLs through and maps bare ids to the API', () => {
    expect(resolveSessionUrl('https://x.test/s.json')).toBe('https://x.test/s.json');
    expect(resolveSessionUrl('/local/s.json')).toBe('/local/s.json');
    expect(resolveSessionUrl('tennisbot-20260706')).toBe(
      '/api/sessions?id=tennisbot-20260706',
    );
  });

  it('rejects refs that are neither URLs nor ids', () => {
    expect(() => resolveSessionUrl('nope nope')).toThrow(SessionParseError);
  });
});

describe('fetchSession', () => {
  it('fetches, validates, and returns a session', async () => {
    const fetchImpl = (async (url: RequestInfo | URL) => {
      expect(url).toBe('/api/sessions?id=demo');
      return new Response(JSON.stringify(demoSession));
    }) as typeof fetch;
    expect(await fetchSession('demo', fetchImpl)).toEqual(demoSession);
  });

  it('surfaces HTTP errors and invalid payloads', async () => {
    const notFound = (async () => new Response('gone', { status: 404 })) as typeof fetch;
    await expect(fetchSession('demo', notFound)).rejects.toThrow('HTTP 404');
    const invalid = (async () => new Response('{"id": "x"}')) as typeof fetch;
    await expect(fetchSession('demo', invalid)).rejects.toThrow(SessionParseError);
  });
});
