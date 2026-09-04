/**
 * Presentation modes (spec section 5). Player is the default and hides every
 * developer surface; Analysis adds numbers and the court panel; Developer adds
 * the WebMCP surface. Selected via `?debug=1`, `?mode=<mode>` or the header
 * overflow menu.
 */
export type ViewMode = 'player' | 'analysis' | 'developer';

export const VIEW_MODES: readonly ViewMode[] = ['player', 'analysis', 'developer'];

function isViewMode(value: string | null): value is ViewMode {
  return value !== null && (VIEW_MODES as readonly string[]).includes(value);
}

/** `?debug=1` wins, then `?mode=`, otherwise player. */
export function readViewMode(search: string): ViewMode {
  const params = new URLSearchParams(search);
  if (params.get('debug') === '1') {
    return 'developer';
  }
  const mode = params.get('mode')?.trim().toLowerCase() ?? null;
  return isViewMode(mode) ? mode : 'player';
}

/**
 * A new search string with `mode=` set (removed for player) and `debug`
 * dropped. Every other param (such as `session`) is preserved.
 */
export function withViewMode(search: string, mode: ViewMode): string {
  const params = new URLSearchParams(search);
  params.delete('debug');
  if (mode === 'player') {
    params.delete('mode');
  } else {
    params.set('mode', mode);
  }
  const next = params.toString();
  return next ? `?${next}` : '';
}
