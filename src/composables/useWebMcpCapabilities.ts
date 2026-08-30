import {
  WebMcpAdapter,
  type Capability,
  type WebMcpSyncReport,
} from '@dreamawakelabs/agent-forge';
import {
  onMounted,
  onUnmounted,
  ref,
  watch,
  type WatchSource,
} from 'vue';

export function useWebMcpCapabilities(
  capabilities: readonly Capability<any, any>[],
  availabilitySource: WatchSource<unknown>,
) {
  const adapter = new WebMcpAdapter();
  const supported = ref(adapter.supported);
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
    registered,
    unavailable,
    error,
  };
}
