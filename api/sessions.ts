import { head, put } from '@vercel/blob';
import { timingSafeEqual } from 'node:crypto';

/**
 * /api/sessions — the session store behind the viewer's `?session=<id>` refs.
 *
 * SELF-CONTAINED ON PURPOSE: Vercel's function build does not bundle imports
 * from src/ (runtime ERR_MODULE_NOT_FOUND), so this file imports only
 * packages. Structural checks (token, id shape, shots array, size cap) live
 * here; full TennisSession schema validation is the client's job — every
 * external session goes through src/domain/sessionLoader.ts parseSession
 * before it replaces the demo fixture.
 *
 * POST (tennisbot's `replay_export --push`): body = a TennisSession JSON,
 * `x-replay-token` header must equal the REPLAY_PUSH_TOKEN env var. Stored
 * at `sessions/<id>.json` on Vercel Blob (public, overwritable — re-pushing
 * a session updates it in place).
 *
 * GET ?id=<id>: returns the stored session JSON same-origin (no CORS or
 * long blob URLs in share links).
 *
 * Requires a connected Blob store (BLOB_READ_WRITE_TOKEN) and
 * REPLAY_PUSH_TOKEN; without the push token POST is disabled rather
 * than open.
 */

const BLOB_PREFIX = 'sessions/';
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const MAX_SHOTS = 5000;
const MAX_BYTES = 4 * 1024 * 1024;

export interface SessionsRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface SessionsResponse {
  status(code: number): SessionsResponse;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
}

function tokenMatches(given: unknown, expected: string): boolean {
  if (typeof given !== 'string') {
    return false;
  }
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Structural gate only — the viewer's parseSession is the real validator. */
function checkSession(body: unknown): { id: string; shots: unknown[]; payload: string } | string {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'session must be a JSON object';
  }
  const record = body as Record<string, unknown>;
  if (typeof record.id !== 'string' || !ID_PATTERN.test(record.id)) {
    return `session.id must match ${ID_PATTERN}`;
  }
  if (!Array.isArray(record.shots)) {
    return 'session.shots must be an array';
  }
  if (record.shots.length > MAX_SHOTS) {
    return `session.shots has ${record.shots.length} entries (max ${MAX_SHOTS})`;
  }
  const payload = JSON.stringify(record);
  if (payload.length > MAX_BYTES) {
    return `session JSON is ${payload.length} bytes (max ${MAX_BYTES})`;
  }
  return { id: record.id, shots: record.shots, payload };
}

async function handlePost(req: SessionsRequest, res: SessionsResponse): Promise<void> {
  const expected = process.env.REPLAY_PUSH_TOKEN;
  if (!expected) {
    res.status(503).json({ error: 'push is disabled: REPLAY_PUSH_TOKEN is not set' });
    return;
  }
  if (!tokenMatches(single(req.headers['x-replay-token']), expected)) {
    res.status(401).json({ error: 'invalid or missing x-replay-token' });
    return;
  }

  const session = checkSession(req.body);
  if (typeof session === 'string') {
    res.status(400).json({ error: `invalid session: ${session}` });
    return;
  }

  const blob = await put(`${BLOB_PREFIX}${session.id}.json`, session.payload, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
  res.status(200).json({
    id: session.id,
    shots: session.shots.length,
    blobUrl: blob.url,
    viewerPath: `/?session=${encodeURIComponent(session.id)}`,
  });
}

async function handleGet(req: SessionsRequest, res: SessionsResponse): Promise<void> {
  const id = single(req.query.id)?.trim();
  if (!id || !ID_PATTERN.test(id)) {
    res.status(400).json({ error: 'missing or invalid ?id=<session-id>' });
    return;
  }

  let blobUrl: string;
  try {
    blobUrl = (await head(`${BLOB_PREFIX}${id}.json`)).url;
  } catch {
    res.status(404).json({ error: `no stored session: ${id}` });
    return;
  }
  const stored = await fetch(blobUrl);
  if (!stored.ok) {
    res.status(502).json({ error: `blob fetch failed with HTTP ${stored.status}` });
    return;
  }
  res.setHeader('cache-control', 'no-store');
  res.status(200).json(await stored.json());
}

export default async function handler(
  req: SessionsRequest,
  res: SessionsResponse,
): Promise<void> {
  if (req.method === 'POST') {
    return handlePost(req, res);
  }
  if (req.method === 'GET') {
    return handleGet(req, res);
  }
  res.setHeader('allow', 'GET, POST');
  res.status(405).json({ error: 'method not allowed' });
}
