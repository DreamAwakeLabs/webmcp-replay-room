import {
  WebMcpAdapter,
  type Capability,
  type WebMcpModelContext,
  type WebMcpSyncReport,
} from '@dreamawakelabs/agent-forge';
import {
  onMounted,
  onUnmounted,
  ref,
  watch,
  type WatchSource,
} from 'vue';

export type WebMcpSurface = 'navigator.modelContext' | 'document.modelContext';

/**
 * Where the browser exposes the WebMCP Imperative API. The spec moved the
 * getter to `document.modelContext` (Chrome 150+); `navigator.modelContext`
 * was the Chrome 149 location, a deprecated alias on 150, and is gone from
 * 153 — so it is only a short-lived fallback here.
 */
export function resolveModelContext(): { context: WebMcpModelContext | null; surface: WebMcpSurface | null } {
  const candidates: Array<[WebMcpSurface, unknown]> = [
    ['document.modelContext', typeof document === 'undefined' ? undefined : (document as { modelContext?: unknown }).modelContext],
    ['navigator.modelContext', typeof navigator === 'undefined' ? undefined : (navigator as { modelContext?: unknown }).modelContext],
  ];
  for (const [surface, candidate] of candidates) {
    if (candidate && typeof (candidate as WebMcpModelContext).registerTool === 'function') {
      return { context: candidate as WebMcpModelContext, surface };
    }
  }
  return { context: null, surface: null };
}

export function useWebMcpCapabilities(
  capabilities: readonly Capability<any, any>[],
  availabilitySource: WatchSource<unknown>,
) {
  const resolved = resolveModelContext();
  const adapter = new WebMcpAdapter({ modelContext: resolved.context });
  const supported = ref(adapter.supported);
  const surface = ref<WebMcpSurface | null>(resolved.surface);
  const registered = ref<string[]>([]);
  const unavailable = ref<WebMcpSyncReport['unavailable']>([]);
  const error = ref<string | null>(null);
  let queue: Promise<void> = Promise.resolve();

  const scheduleSync = () => {
    queue = queue.then(async () => {
      try {
        const report = await adapter.sync(capabilities);
        supported.value = report.supported;
        registered.value = report.registered;
        unavailable.value = report.unavailable;
        error.value = null;
      } catch (cause) {
        error.value = cause instanceof Error ? cause.message : String(cause);
      }
    });
  };

  onMounted(scheduleSync);
  watch(availabilitySource, scheduleSync);
  onUnmounted(() => adapter.dispose());

  return {
    supported,
    surface,
    registered,
    unavailable,
    error,
  };
}
