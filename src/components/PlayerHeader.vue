<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { MetricName, TennisSession } from '../domain/session';
import { METRIC_LABELS } from '../domain/coaching';
import { VIEW_MODES, type ViewMode } from '../state/viewMode';

const props = defineProps<{
  session: TennisSession;
  focus: MetricName | null;
  similarCount: number;
  mode: ViewMode;
  webMcpReady: boolean;
}>();

const emit = defineEmits<{
  import: [];
  'copy-link': [];
  details: [];
  'set-mode': [mode: ViewMode];
}>();

const MODE_LABELS: Record<ViewMode, string> = {
  player: 'Player mode',
  analysis: 'Analysis mode',
  developer: 'Developer mode',
};

const focusText = computed(() =>
  props.focus ? `Main focus: ${METRIC_LABELS[props.focus]}` : 'No focus set yet',
);

const similarText = computed(() =>
  props.similarCount === 1 ? '1 similar shot' : `${props.similarCount} similar shots`,
);

const open = ref(false);
const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const menu = ref<HTMLElement | null>(null);

function items(): HTMLElement[] {
  return Array.from(menu.value?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []);
}

function focusItem(index: number) {
  const list = items();
  if (list.length === 0) {
    return;
  }
  const wrapped = ((index % list.length) + list.length) % list.length;
  list[wrapped]?.focus();
}

async function openMenu(startIndex = 0) {
  open.value = true;
  await nextTick();
  focusItem(startIndex);
}

function closeMenu(restoreFocus = true) {
  if (!open.value) {
    return;
  }
  open.value = false;
  if (restoreFocus) {
    trigger.value?.focus();
  }
}

function toggleMenu() {
  if (open.value) {
    closeMenu();
  } else {
    void openMenu(0);
  }
}

function onTriggerKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    void openMenu(0);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    void openMenu(-1);
  }
}

function onMenuKeydown(event: KeyboardEvent) {
  const list = items();
  const current = list.indexOf(document.activeElement as HTMLElement);
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      focusItem(current + 1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      focusItem(current - 1);
      break;
    case 'Home':
      event.preventDefault();
      focusItem(0);
      break;
    case 'End':
      event.preventDefault();
      focusItem(list.length - 1);
      break;
    case 'Escape':
      event.preventDefault();
      closeMenu();
      break;
    case 'Tab':
      closeMenu(false);
      break;
    default:
      break;
  }
}

function onDocumentPointerDown(event: Event) {
  if (open.value && root.value && !root.value.contains(event.target as Node)) {
    closeMenu(false);
  }
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    event.preventDefault();
    closeMenu();
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown);
  document.addEventListener('keydown', onDocumentKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown);
  document.removeEventListener('keydown', onDocumentKeydown);
});

watch(
  () => props.mode,
  () => closeMenu(false),
);

function run(action: () => void) {
  closeMenu();
  action();
}

function chooseMode(mode: ViewMode) {
  run(() => {
    if (mode !== props.mode) {
      emit('set-mode', mode);
    }
  });
}
</script>

<template>
  <header ref="root" class="player-header">
    <div class="brand-block">
      <p class="brand">Replay Room</p>
      <span v-if="mode !== 'player'" class="mode-badge" data-test="mode-badge">
        {{ MODE_LABELS[mode] }}
      </span>
      <span
        v-if="mode === 'developer'"
        class="coach-status"
        :class="{ 'is-ready': webMcpReady }"
        data-test="coach-status"
      >
        <span class="status-dot" aria-hidden="true"></span>
        {{ webMcpReady ? 'Coach connected' : 'Coach offline' }}
      </span>
    </div>

    <div class="session-block">
      <h1 class="session-title" data-test="session-title">
        {{ session.title }}
        <span class="session-date">· {{ session.dateLabel }}</span>
      </h1>
      <div class="focus-row">
        <p class="focus" :class="{ 'is-empty': !focus }" data-test="focus">
          {{ focusText }}
        </p>
        <span
          v-if="similarCount > 0"
          class="chip is-accent"
          data-test="similar-chip"
        >
          {{ similarText }}
        </span>
      </div>
    </div>

    <div class="menu-block">
      <button
        ref="trigger"
        type="button"
        class="overflow-button"
        aria-label="More options"
        aria-haspopup="menu"
        :aria-expanded="open ? 'true' : 'false'"
        aria-controls="player-header-menu"
        data-test="menu-trigger"
        @click="toggleMenu"
        @keydown="onTriggerKeydown"
      >
        <span aria-hidden="true">···</span>
      </button>

      <div
        v-if="open"
        id="player-header-menu"
        ref="menu"
        class="menu"
        role="menu"
        aria-label="More options"
        @keydown="onMenuKeydown"
      >
        <button
          type="button"
          class="menu-item"
          role="menuitem"
          tabindex="-1"
          data-test="menu-import"
          @click="run(() => emit('import'))"
        >
          Import session…
        </button>
        <button
          type="button"
          class="menu-item"
          role="menuitem"
          tabindex="-1"
          data-test="menu-copy-link"
          @click="run(() => emit('copy-link'))"
        >
          Copy session link
        </button>
        <button
          type="button"
          class="menu-item"
          role="menuitem"
          tabindex="-1"
          data-test="menu-details"
          @click="run(() => emit('details'))"
        >
          Session details
        </button>

        <div class="menu-separator" role="separator"></div>
        <p class="menu-group-label" id="player-header-mode-label" role="presentation">View</p>
        <div role="group" aria-labelledby="player-header-mode-label">
          <button
            v-for="candidate in VIEW_MODES"
            :key="candidate"
            type="button"
            class="menu-item"
            role="menuitemradio"
            tabindex="-1"
            :aria-checked="candidate === mode ? 'true' : 'false'"
            :data-test="`menu-mode-${candidate}`"
            @click="chooseMode(candidate)"
          >
            <span class="check" aria-hidden="true">{{ candidate === mode ? '✓' : '' }}</span>
            {{ MODE_LABELS[candidate] }}
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.player-header {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--s5);
  padding: var(--s3) var(--s5);
  background: var(--surface);
  border-bottom: 1px solid var(--line-soft);
}

.brand-block {
  display: flex;
  align-items: center;
  gap: var(--s2);
}

.brand {
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--accent-ink);
  white-space: nowrap;
}

.mode-badge {
  padding: 0 var(--s2);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--muted);
  background: var(--surface-2);
  white-space: nowrap;
}

.coach-status {
  display: inline-flex;
  align-items: center;
  gap: var(--s1);
  font-size: var(--text-xs);
  color: var(--muted);
  white-space: nowrap;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--quiet);
}
.coach-status.is-ready .status-dot { background: var(--strong); }

.session-block {
  min-width: 0;
}

.session-title {
  font-size: var(--text-lg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-date {
  font-weight: 400;
  color: var(--muted);
}

.focus-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--s2);
  margin-top: var(--s1);
}

.focus {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--accent-ink);
}
.focus.is-empty {
  font-weight: 400;
  color: var(--muted);
}

.menu-block {
  position: relative;
  justify-self: end;
}

.overflow-button {
  min-width: var(--tap);
  min-height: var(--tap);
  padding: 0 var(--s2);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--ink);
  font-size: var(--text-lg);
  font-weight: 700;
  line-height: 1;
}
.overflow-button:hover,
.overflow-button[aria-expanded='true'] {
  background: var(--surface-2);
}

.menu {
  position: absolute;
  top: calc(100% + var(--s1));
  right: 0;
  z-index: 20;
  min-width: 220px;
  padding: var(--s1);
  background: var(--surface);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius);
  box-shadow: var(--shadow-soft);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--s2);
  width: 100%;
  min-height: var(--tap);
  padding: 0 var(--s3);
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--ink);
  font-size: var(--text-sm);
  text-align: left;
  white-space: nowrap;
}
.menu-item:hover { background: var(--surface-2); }
.menu-item[aria-checked='true'] {
  color: var(--accent-ink);
  font-weight: 600;
}

.check {
  display: inline-block;
  width: 1em;
  color: var(--accent);
}

.menu-separator {
  height: 1px;
  margin: var(--s1) var(--s2);
  background: var(--line-soft);
}

.menu-group-label {
  padding: var(--s1) var(--s3);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--quiet);
}

@media (max-width: 720px) {
  .player-header {
    grid-template-columns: 1fr auto;
    gap: var(--s3);
    padding: var(--s3) var(--s4);
  }
  .brand-block { grid-column: 1; }
  .menu-block { grid-column: 2; grid-row: 1; }
  .session-block { grid-column: 1 / -1; }
}
</style>
