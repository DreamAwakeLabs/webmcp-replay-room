import { head, put } from '@vercel/blob';
import { timingSafeEqual } from 'node:crypto';
import {
  parseSession,
  SESSION_ID_PATTERN,
  SessionParseError,
} from '../domain/sessionLoader';

/**
 * /api/sessions — the session store behind the viewer's `?session=<id>` refs.
 *
 * POST (tennisbot's `replay_export --push`): body = a TennisSession JSON,
 * `x-replay-token` header must equal the REPLAY_PUSH_TOKEN env var. The
 * validated session is written to Vercel Blob at `sessions/<id>.json`
 * (public, overwritable — re-pushing a session updates it in place).
 *
 * GET ?id=<id>: returns the stored session JSON same-origin (no CORS or
 * long blob URLs in share links).
 *
 * Requires a Vercel Blob store connected to the project
 * (BLOB_READ_WRITE_TOKEN) and REPLAY_PUSH_TOKEN set; without the push
 * token POST is disabled rather than open.
 */

const BLOB_PREFIX = 'sessions/';

// minimal request/response shapes so tests need no @vercel/node runtime
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

  let session;
  try {
    session = parseSession(req.body);
  } catch (cause) {
    if (cause instanceof SessionParseError) {
      res.status(400).json({ error: `invalid session: ${cause.message}` });
      return;
    }
    throw cause;
  }
  if (!SESSION_ID_PATTERN.test(session.id)) {
    res.status(400).json({ error: `session.id must match ${SESSION_ID_PATTERN}` });
    return;
  }

  const blob = await put(`${BLOB_PREFIX}${session.id}.json`, JSON.stringify(session), {
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
  if (!id || !SESSION_ID_PATTERN.test(id)) {
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
