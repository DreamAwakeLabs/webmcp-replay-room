import {
  METRIC_NAMES,
  type Shot,
  type ShotMetrics,
  type TennisSession,
} from './session';

/**
 * Runtime loading of a TennisSession fixture from outside the bundle:
 * `?session=<ref>` where <ref> is a URL (absolute or same-origin path) or a
 * bare session id served by `/api/sessions?id=<id>`, plus JSON files handed
 * over via drag-drop / file picker. Everything external is validated with
 * parseSession before it replaces the demo fixture.
 */

const STROKES = new Set(['forehand', 'backhand', 'serve']);
const OUTCOMES = new Set(['clean', 'late', 'off-balance', 'mishit']);
const MAX_SHOTS = 5000;

/** Bare session ids we are willing to turn into an /api/sessions URL. */
export const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export class SessionParseError extends Error {}

function fail(message: string): never {
  throw new SessionParseError(message);
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${label} must be a non-empty string`);
  }
  return value;
}

function asNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`${label} must be a finite number`);
  }
  return value;
}

function parseMetrics(value: unknown, label: string): ShotMetrics {
  const record = asRecord(value, label);
  const metrics = {} as ShotMetrics;
  for (const name of METRIC_NAMES) {
    const metric = asNumber(record[name], `${label}.${name}`);
    if (metric < 0 || metric > 1) {
      fail(`${label}.${name} must be within 0..1`);
    }
    metrics[name] = metric;
  }
  return metrics;
}

function parseShot(value: unknown, label: string): Shot {
  const record = asRecord(value, label);
  const stroke = asString(record.stroke, `${label}.stroke`);
  if (!STROKES.has(stroke)) {
    fail(`${label}.stroke must be one of ${[...STROKES].join(', ')}`);
  }
  const outcome = asString(record.outcome, `${label}.outcome`);
  if (!OUTCOMES.has(outcome)) {
    fail(`${label}.outcome must be one of ${[...OUTCOMES].join(', ')}`);
  }
  const court = asRecord(record.court, `${label}.court`);
  return {
    id: asString(record.id, `${label}.id`),
    number: asNumber(record.number, `${label}.number`),
    stroke: stroke as Shot['stroke'],
    outcome: outcome as Shot['outcome'],
    timestampSeconds: asNumber(record.timestampSeconds, `${label}.timestampSeconds`),
    metrics: parseMetrics(record.metrics, `${label}.metrics`),
    note: typeof record.note === 'string' ? record.note : '',
    court: {
      x: asNumber(court.x, `${label}.court.x`),
      y: asNumber(court.y, `${label}.court.y`),
    },
  };
}

/** Validate untrusted data into a TennisSession, or throw SessionParseError. */
export function parseSession(data: unknown): TennisSession {
  const record = asRecord(data, 'session');
  if (!Array.isArray(record.shots)) {
    fail('session.shots must be an array');
  }
  if (record.shots.length > MAX_SHOTS) {
    fail(`session.shots has ${record.shots.length} entries (max ${MAX_SHOTS})`);
  }
  const shots = record.shots.map((shot, index) => parseShot(shot, `shots[${index}]`));
  const seen = new Set<string>();
  for (const shot of shots) {
    if (seen.has(shot.id)) {
      fail(`duplicate shot id: ${shot.id}`);
    }
    seen.add(shot.id);
  }
  return {
    id: asString(record.id, 'session.id'),
    title: asString(record.title, 'session.title'),
    dateLabel: asString(record.dateLabel, 'session.dateLabel'),
    durationMinutes: asNumber(record.durationMinutes, 'session.durationMinutes'),
    shots,
  };
}

/** The `?session=` value from a location search string, or null. */
export function readSessionParam(search: string): string | null {
  const value = new URLSearchParams(search).get('session')?.trim();
  return value ? value : null;
}

/** Map a `?session=` ref to a fetchable URL (URL as-is, bare id via the API). */
export function resolveSessionUrl(ref: string): string {
  if (/^https?:\/\//i.test(ref) || ref.startsWith('/')) {
    return ref;
  }
  if (!SESSION_ID_PATTERN.test(ref)) {
    fail(`"${ref}" is neither a URL nor a valid session id`);
  }
  return `/api/sessions?id=${encodeURIComponent(ref)}`;
}

/** Fetch + validate the session behind a `?session=` ref. */
export async function fetchSession(
  ref: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TennisSession> {
  const url = resolveSessionUrl(ref);
  const response = await fetchImpl(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`session fetch failed with HTTP ${response.status}`);
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new SessionParseError('response is not valid JSON');
  }
  return parseSession(data);
}
