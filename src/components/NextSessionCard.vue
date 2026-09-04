<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { METRIC_NAMES, type MetricName } from '../domain/session';
import { DRILLS, METRIC_LABELS } from '../domain/coaching';
import type { CoachingPlan } from '../state/replayState';
import type { ViewMode } from '../state/viewMode';

const props = defineProps<{
  plan: CoachingPlan;
  suggestedFocus: MetricName | null;
  mode: ViewMode;
}>();

const emit = defineEmits<{
  (event: 'set-focus', metric: MetricName): void;
  (event: 'clear-focus'): void;
}>();

const changing = ref(false);

const focus = computed(() => props.plan.focus);
const focusLabel = computed(() => (focus.value ? METRIC_LABELS[focus.value] : ''));
const cue = computed(() => {
  if (!focus.value) {
    return '';
  }
  const note = props.plan.note.trim();
  return note.length > 0 ? note : DRILLS[focus.value].cue;
});
const drill = computed(() => (focus.value ? DRILLS[focus.value].drill : ''));
const suggestedLabel = computed(() =>
  props.suggestedFocus ? METRIC_LABELS[props.suggestedFocus] : '',
);
const otherMetrics = computed(() => METRIC_NAMES.filter((metric) => metric !== focus.value));
/** Raw metric keys are developer vocabulary only (spec section 22). */
const showKeys = computed(() => props.mode === 'developer');

watch(focus, () => {
  changing.value = false;
});

function choose(metric: MetricName) {
  changing.value = false;
  emit('set-focus', metric);
}
</script>

<template>
  <section class="panel next-session" aria-labelledby="next-session-heading">
    <h2 id="next-session-heading" class="eyebrow">Next practice</h2>

    <div v-if="focus" class="plan">
      <dl class="rows">
        <div class="row">
          <dt>
            Focus
            <span class="chip is-accent tag">Observed</span>
          </dt>
          <dd class="focus-value">
            {{ focusLabel }}
            <code v-if="showKeys" class="metric-key">{{ focus }}</code>
          </dd>
        </div>
        <div class="row">
          <dt>Cue</dt>
          <dd>{{ cue }}</dd>
        </div>
        <div class="row">
          <dt>
            Suggested drill
            <span class="chip tag">Recommended</span>
          </dt>
          <dd>{{ drill }}</dd>
        </div>
      </dl>

      <div class="controls">
        <button
          type="button"
          class="text-button change-button"
          :aria-expanded="changing"
          aria-controls="next-session-options"
          @click="changing = !changing"
        >
          Change
        </button>
        <button type="button" class="text-button clear-button" @click="emit('clear-focus')">
          Clear
        </button>
      </div>

      <div
        v-if="changing"
        id="next-session-options"
        class="options"
        role="group"
        aria-label="Choose a focus"
      >
        <button
          v-for="metric in otherMetrics"
          :key="metric"
          type="button"
          class="option-button"
          :data-metric="metric"
          @click="choose(metric)"
        >
          {{ METRIC_LABELS[metric] }}
        </button>
      </div>
    </div>

    <div v-else class="empty">
      <p class="empty-title">No focus yet</p>
      <p class="empty-copy">
        Pick one thing to work on next time. Your coach can save one for you, or choose it yourself.
      </p>
      <button
        v-if="suggestedFocus"
        type="button"
        class="suggest-button"
        @click="choose(suggestedFocus)"
      >
        Make {{ suggestedLabel }} my focus
      </button>
    </div>
  </section>
</template>

<style scoped>
.next-session {
  padding: var(--s4) var(--s5);
  display: grid;
  gap: var(--s3);
}

.plan {
  display: grid;
  gap: var(--s3);
}

.rows {
  margin: 0;
  display: grid;
  gap: var(--s3);
}

.row {
  display: grid;
  gap: var(--s1);
}

dt {
  display: flex;
  align-items: center;
  gap: var(--s2);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--muted);
}

dd {
  margin: 0;
  color: var(--ink);
}

.focus-value {
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.metric-key {
  margin-left: var(--s2);
  font-size: var(--text-xs);
  font-weight: 400;
  color: var(--quiet);
}

.tag {
  padding: 0 var(--s2);
}

.controls {
  display: flex;
  gap: var(--s2);
}

.controls .text-button {
  color: var(--muted);
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s2);
}

.option-button,
.suggest-button {
  min-height: var(--tap);
  padding: 0 var(--s4);
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  font-size: var(--text-sm);
  font-weight: 500;
}

.option-button:hover {
  background: var(--surface-2);
}

.suggest-button {
  justify-self: start;
  border-color: transparent;
  background: var(--accent);
  color: var(--surface);
}

.suggest-button:hover {
  background: var(--accent-ink);
}

.empty {
  display: grid;
  gap: var(--s2);
}

.empty-title {
  font-weight: 600;
}

.empty-copy {
  color: var(--muted);
  font-size: var(--text-sm);
}
</style>
