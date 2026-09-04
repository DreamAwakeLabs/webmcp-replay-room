<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

export interface WebMcpStatus {
  supported: boolean;
  surface: string | null;
  registered: string[];
  unavailable: { id: string; reason: string }[];
  error: string | null;
}

export interface CapabilitySummary {
  id: string;
  title: string;
  effect: string;
}

const props = defineProps<{
  open: boolean;
  webMcp: WebMcpStatus;
  capabilities: CapabilitySummary[];
  sessionId: string;
  sessionSource: string;
  activity: string[];
}>();

const emit = defineEmits<{
  (event: 'close'): void;
}>();

const closeButton = ref<HTMLButtonElement | null>(null);

const registeredCount = computed(() => props.webMcp.registered.length);
const totalCount = computed(() => props.capabilities.length);

function isRegistered(id: string): boolean {
  return props.webMcp.registered.includes(id);
}

function reasonFor(id: string): string | null {
  return props.webMcp.unavailable.find((entry) => entry.id === id)?.reason ?? null;
}

function onKeydown(event: KeyboardEvent) {
  // An Escape already consumed elsewhere (the header menu) must not also close the drawer.
  if (event.key === 'Escape' && props.open && !event.defaultPrevented) {
    event.preventDefault();
    emit('close');
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));

// The element that had focus before the drawer opened; focus returns there on close.
let previousFocus: HTMLElement | null = null;

watch(
  () => props.open,
  (open) => {
    if (open) {
      const active = document.activeElement;
      previousFocus = active instanceof HTMLElement && active !== document.body ? active : null;
      closeButton.value?.focus();
      return;
    }
    if (previousFocus?.isConnected) {
      previousFocus.focus();
    }
    previousFocus = null;
  },
  { flush: 'post' },
);
</script>

<template>
  <aside
    v-if="open"
    class="panel developer-drawer"
    role="complementary"
    aria-label="Developer"
  >
    <header class="drawer-header">
      <h2>Developer</h2>
      <button
        ref="closeButton"
        type="button"
        class="text-button close-button"
        aria-label="Close developer panel"
        @click="emit('close')"
      >
        Close
      </button>
    </header>

    <dl class="status-rows">
      <div class="status-row">
        <dt>WebMCP</dt>
        <dd>
          <span class="chip" :class="webMcp.supported ? 'is-strong' : 'is-issue'">
            {{ webMcp.supported ? 'Ready' : 'Unavailable' }}
          </span>
        </dd>
      </div>
      <div class="status-row">
        <dt>Surface</dt>
        <dd><code>{{ webMcp.surface ?? 'none' }}</code></dd>
      </div>
      <div class="status-row">
        <dt>Tools</dt>
        <dd>{{ registeredCount }}/{{ totalCount }} registered</dd>
      </div>
      <div class="status-row">
        <dt>Session id</dt>
        <dd><code>{{ sessionId }}</code></dd>
      </div>
      <div class="status-row">
        <dt>Source</dt>
        <dd>{{ sessionSource }}</dd>
      </div>
    </dl>

    <section aria-labelledby="developer-capabilities">
      <h3 id="developer-capabilities" class="eyebrow">Capabilities</h3>
      <ul class="capability-list">
        <li
          v-for="capability in capabilities"
          :key="capability.id"
          class="capability"
          :class="{ 'is-registered': isRegistered(capability.id) }"
        >
          <span class="mark" aria-hidden="true">{{ isRegistered(capability.id) ? '✓' : '·' }}</span>
          <span class="sr-only">{{ isRegistered(capability.id) ? 'Registered' : 'Not registered' }}</span>
          <code class="capability-id">{{ capability.id }}</code>
          <span class="chip effect">{{ capability.effect }}</span>
          <span class="capability-title">{{ capability.title }}</span>
          <span v-if="reasonFor(capability.id)" class="reason">{{ reasonFor(capability.id) }}</span>
        </li>
      </ul>
    </section>

    <section aria-labelledby="developer-activity">
      <h3 id="developer-activity" class="eyebrow">Recent activity</h3>
      <p v-if="activity.length === 0" class="quiet">No activity yet.</p>
      <ol v-else class="activity-list">
        <li v-for="(entry, index) in activity" :key="`${index}-${entry}`">{{ entry }}</li>
      </ol>
    </section>

    <p v-if="webMcp.error" class="error-copy" role="status">
      <span class="error-label">Error</span>
      <code>{{ webMcp.error }}</code>
    </p>
  </aside>
</template>

<style scoped>
.developer-drawer {
  display: grid;
  gap: var(--s4);
  padding: var(--s4) var(--s5);
  font-size: var(--text-sm);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s3);
}

.status-rows {
  margin: 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: var(--s1) var(--s4);
  align-items: center;
}

.status-row {
  display: contents;
}

dt {
  color: var(--muted);
  font-weight: 500;
}

dd {
  margin: 0;
}

code {
  font-size: var(--text-sm);
  color: var(--ink);
}

.capability-list,
.activity-list {
  margin: var(--s2) 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--s2);
}

.capability {
  display: grid;
  grid-template-columns: max-content 1fr max-content;
  gap: var(--s1) var(--s2);
  align-items: center;
  padding: var(--s2) 0;
  border-top: 1px solid var(--line-soft);
  color: var(--muted);
}

.capability.is-registered {
  color: var(--ink);
}

.mark {
  width: var(--s4);
  text-align: center;
  color: var(--quiet);
}

.is-registered .mark {
  color: var(--strong);
}

.capability-title,
.reason {
  grid-column: 2 / -1;
  font-size: var(--text-xs);
  color: var(--muted);
}

.reason {
  color: var(--issue);
}

.activity-list li {
  padding-left: var(--s3);
  border-left: 2px solid var(--line);
  color: var(--ink);
}

.quiet {
  color: var(--quiet);
}

.error-copy {
  display: grid;
  gap: var(--s1);
  padding: var(--s3);
  border-radius: var(--radius-sm);
  background: var(--issue-soft);
  color: var(--issue);
}

.error-copy code {
  color: var(--issue);
}

.error-label {
  font-weight: 600;
}
</style>
