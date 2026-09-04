<script setup lang="ts">
import { computed } from 'vue';
import {
  biggestDifference,
  explainDifference,
  METRIC_LABELS,
  scoreOf,
  strokePlural,
} from '../domain/coaching';
import type { Shot, ShotSetComparison, StrokeType } from '../domain/session';
import type { ViewMode } from '../state/viewMode';

const props = defineProps<{
  problemShots: Shot[];
  referenceShots: Shot[];
  comparison: ShotSetComparison | null;
  stroke: StrokeType | null;
  mode: ViewMode;
}>();

const emit = defineEmits<{
  compare: [];
  clear: [];
}>();

const buttonLabel = computed(() => (
  props.stroke
    ? `Compare to my best ${strokePlural(props.stroke)}`
    : 'Compare to my best shots'
));

const biggest = computed(() => (
  props.comparison && props.comparison.metrics.length > 0
    ? biggestDifference(props.comparison)
    : null
));

const explanation = computed(() => (
  props.comparison && props.comparison.metrics.length > 0
    ? explainDifference(props.comparison)
    : null
));

const showTable = computed(() => props.mode !== 'player');

function signed(delta: number): string {
  const score = scoreOf(delta);
  return score > 0 ? `+${score}` : `${score}`;
}

const rows = computed(() => {
  if (!props.comparison) {
    return [];
  }
  return props.comparison.metrics.map((row) => ({
    metric: row.metric,
    label: METRIC_LABELS[row.metric],
    problem: scoreOf(row.baseline),
    best: scoreOf(row.comparison),
    delta: signed(row.delta),
    largest: row.metric === biggest.value?.metric,
  }));
});

function numbers(shots: Shot[]): string {
  return shots.map((shot) => shot.number).join(', ');
}
</script>

<template>
  <section class="compare panel" aria-labelledby="compare-heading">
    <template v-if="!comparison || !biggest || !explanation">
      <p class="eyebrow">Compare</p>
      <h2 id="compare-heading">Compare to your best</h2>
      <p class="lead">
        See what your strongest shots do differently from the ones giving you trouble.
      </p>
      <button
        type="button"
        class="primary"
        :disabled="stroke === null"
        @click="emit('compare')"
      >
        {{ buttonLabel }}
      </button>
      <p v-if="stroke === null" class="hint">
        Pick a shot first so your coach knows which stroke to compare.
      </p>
    </template>

    <template v-else>
      <p class="eyebrow">Compare to your best</p>
      <h2 id="compare-heading" class="biggest">
        Biggest difference: {{ METRIC_LABELS[biggest.metric] }}
      </h2>

      <div class="columns">
        <div class="column">
          <h3>Your problem shots</h3>
          <p class="shots">{{ problemShots.length > 0 ? `Shots ${numbers(problemShots)}` : '' }}</p>
          <p>{{ explanation.problem }}</p>
        </div>
        <div class="column is-best">
          <h3>Your best shots</h3>
          <p class="shots">{{ referenceShots.length > 0 ? `Shots ${numbers(referenceShots)}` : '' }}</p>
          <p>{{ explanation.best }}</p>
        </div>
      </div>

      <table v-if="showTable" class="deltas">
        <caption class="sr-only">Score by area, problem shots against best shots</caption>
        <thead>
          <tr>
            <th scope="col">Area</th>
            <th scope="col" class="num">Problem</th>
            <th scope="col" class="num">Best</th>
            <th scope="col" class="num">Change</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.metric"
            :class="{ 'is-largest': row.largest }"
          >
            <th scope="row">
              {{ row.label }}
              <span v-if="row.largest" class="marker">
                <span aria-hidden="true">&#9679;</span> largest
              </span>
            </th>
            <td class="num">{{ row.problem }}</td>
            <td class="num">{{ row.best }}</td>
            <td class="num">{{ row.delta }}</td>
          </tr>
        </tbody>
      </table>

      <button type="button" class="clear text-button" @click="emit('clear')">
        Clear comparison
      </button>
    </template>
  </section>
</template>

<style scoped>
.compare {
  padding: var(--s4);
  display: flex;
  flex-direction: column;
  gap: var(--s3);
}

.lead,
.hint {
  color: var(--muted);
  font-size: var(--text-sm);
}

.primary {
  align-self: flex-start;
  min-height: var(--tap);
  padding: 0 var(--s4);
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: var(--surface);
  font-weight: 600;
  font-size: var(--text-sm);
}

.primary:hover:not(:disabled) {
  background: var(--accent-ink);
}

.primary:disabled {
  background: var(--surface-2);
  color: var(--quiet);
}

.biggest {
  color: var(--accent-ink);
}

.columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--s3);
}

.column {
  padding: var(--s3);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  display: flex;
  flex-direction: column;
  gap: var(--s1);
  font-size: var(--text-sm);
}

.column.is-best {
  background: var(--strong-soft);
}

.shots {
  color: var(--muted);
  font-size: var(--text-xs);
}

.deltas {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.deltas th,
.deltas td {
  padding: var(--s2) var(--s2);
  border-bottom: 1px solid var(--line-soft);
  text-align: left;
}

.deltas thead th {
  color: var(--muted);
  font-weight: 500;
  font-size: var(--text-xs);
}

.deltas .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.deltas tr.is-largest th,
.deltas tr.is-largest td {
  font-weight: 700;
  background: var(--accent-soft);
}

.marker {
  margin-left: var(--s1);
  color: var(--accent-ink);
  font-size: var(--text-xs);
  font-weight: 600;
}

.clear {
  align-self: flex-start;
}
</style>
