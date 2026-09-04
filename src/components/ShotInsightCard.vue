<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { METRIC_LABELS, STROKE_LABELS, describeShot } from '../domain/coaching';
import type { MetricName, Shot } from '../domain/session';
import type { ViewMode } from '../state/viewMode';
import MetricBreakdown from './MetricBreakdown.vue';

const props = defineProps<{
  shot: Shot | null;
  highlighted: MetricName[];
  mode: ViewMode;
}>();

const emit = defineEmits<{
  (event: 'find-similar'): void;
  (event: 'make-focus', metric: MetricName): void;
}>();

const insight = computed(() => (props.shot ? describeShot(props.shot) : null));
const heading = computed(() => (
  props.shot ? `Shot ${props.shot.number} · ${STROKE_LABELS[props.shot.stroke]}` : ''
));

const alwaysShowMetrics = computed(() => props.mode !== 'player');
const metricsOpen = ref(false);
const metricsVisible = computed(() => alwaysShowMetrics.value || metricsOpen.value);

// A newly selected shot starts collapsed again in Player mode.
watch(() => props.shot?.id, () => {
  metricsOpen.value = false;
});

// A coach highlight must be visible without a click, so open the disclosure.
watch(() => props.highlighted.length, (count) => {
  if (count > 0) {
    metricsOpen.value = true;
  }
});

function makeFocus() {
  if (insight.value) {
    emit('make-focus', insight.value.primaryMetric);
  }
}
</script>

<template>
  <section class="panel card" aria-labelledby="shot-insight-heading">
    <p class="eyebrow">Selected shot</p>

    <div v-if="!shot || !insight" class="empty">
      <h2 id="shot-insight-heading">No shot selected</h2>
      <p class="muted">Pick a shot from the session to see what your coach noticed.</p>
    </div>

    <template v-else>
      <h2 id="shot-insight-heading" class="heading">{{ heading }}</h2>

      <dl class="facts">
        <div class="fact">
          <dt class="eyebrow">{{ insight.isStrong ? 'Strength' : 'Main issue' }}</dt>
          <dd class="main-issue">
            <span class="chip" :class="insight.isStrong ? 'is-strong' : 'is-issue'">
              {{ insight.isStrong ? 'Strong shot' : 'Needs work' }}
            </span>
            <span class="main-issue-text">{{ insight.mainIssue }}</span>
          </dd>
        </div>

        <div class="fact">
          <dt class="eyebrow">Why</dt>
          <dd class="why">{{ insight.why }}</dd>
        </div>

        <div class="fact">
          <dt class="eyebrow">{{ insight.isStrong ? 'Lowest area' : 'Most affected' }}</dt>
          <dd class="metric-line primary">
            <span>{{ METRIC_LABELS[insight.primaryMetric] }}</span>
            <span class="score">{{ insight.primaryScore }} / 100</span>
          </dd>
        </div>

        <div class="fact">
          <dt class="eyebrow">{{ insight.isStrong ? 'Also solid' : 'Also affected' }}</dt>
          <dd>
            <ul class="supporting">
              <li
                v-for="item in insight.supporting"
                :key="item.metric"
                class="metric-line"
              >
                <span>{{ METRIC_LABELS[item.metric] }}</span>
                <span class="score">{{ item.score }} / 100</span>
              </li>
            </ul>
          </dd>
        </div>
      </dl>

      <div class="actions">
        <button type="button" class="action primary-action" @click="emit('find-similar')">
          Find similar shots
        </button>
        <button type="button" class="action" @click="makeFocus">
          Make this my next focus
        </button>
      </div>

      <div class="metrics">
        <button
          v-if="!alwaysShowMetrics"
          type="button"
          class="text-button disclosure"
          :aria-expanded="metricsOpen"
          aria-controls="shot-insight-metrics"
          @click="metricsOpen = !metricsOpen"
        >
          {{ metricsOpen ? 'Hide all metrics' : 'View all metrics' }}
        </button>
        <div v-if="metricsVisible" id="shot-insight-metrics" class="metrics-body">
          <p v-if="alwaysShowMetrics" class="eyebrow">All metrics</p>
          <MetricBreakdown
            :metrics="shot.metrics"
            :highlighted="highlighted"
            :show-help="mode === 'player'"
          />
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.card {
  display: grid;
  gap: var(--s4);
  padding: var(--s5);
}

.heading {
  font-size: var(--text-xl);
}

.muted {
  color: var(--muted);
}

.empty {
  display: grid;
  gap: var(--s2);
}

.facts {
  margin: 0;
  display: grid;
  gap: var(--s4);
}

.fact {
  display: grid;
  gap: var(--s1);
}

.fact dd {
  margin: 0;
}

.main-issue {
  display: flex;
  align-items: center;
  gap: var(--s2);
  flex-wrap: wrap;
}

.main-issue-text {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--ink);
}

.why {
  color: var(--ink);
  font-size: var(--text-md);
}

.supporting {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--s1);
}

.metric-line {
  display: flex;
  justify-content: space-between;
  gap: var(--s3);
  font-size: var(--text-md);
}

.metric-line.primary {
  font-weight: 600;
}

.score {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s2);
}

.action {
  min-height: var(--tap);
  padding: 0 var(--s4);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--ink);
  font-weight: 500;
  font-size: var(--text-sm);
}

.action:hover {
  background: var(--surface-2);
}

.primary-action {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--surface);
}

.primary-action:hover {
  background: var(--accent-ink);
}

.metrics {
  display: grid;
  gap: var(--s2);
  border-top: 1px solid var(--line-soft);
  padding-top: var(--s3);
}

.disclosure {
  justify-self: start;
}

.metrics-body {
  display: grid;
  gap: var(--s2);
}
</style>
