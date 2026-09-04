<script setup lang="ts">
import { computed } from 'vue';
import { METRIC_HELP, METRIC_LABELS, scoreOf } from '../domain/coaching';
import { METRIC_NAMES, type MetricName, type ShotMetrics } from '../domain/session';

const props = withDefaults(defineProps<{
  metrics: ShotMetrics;
  highlighted: MetricName[];
  showHelp?: boolean;
}>(), {
  showHelp: false,
});

const rows = computed(() => METRIC_NAMES.map((metric) => ({
  metric,
  label: METRIC_LABELS[metric],
  help: METRIC_HELP[metric],
  score: scoreOf(props.metrics[metric]),
  highlighted: props.highlighted.includes(metric),
})));
</script>

<template>
  <ul class="breakdown" aria-label="All metrics">
    <li
      v-for="row in rows"
      :key="row.metric"
      class="row"
      :class="{ 'is-highlighted': row.highlighted }"
      :data-metric="row.metric"
    >
      <div class="row-head">
        <span class="label">{{ row.label }}</span>
        <span v-if="row.highlighted" class="chip is-accent highlight-tag">Coach highlighted</span>
        <span class="score">
          <strong>{{ row.score }}</strong>
          <span class="score-of"> / 100</span>
        </span>
      </div>
      <div
        class="track"
        role="meter"
        :aria-label="`${row.label} score`"
        :aria-valuenow="row.score"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuetext="`${row.score} out of 100`"
      >
        <div class="fill" :style="{ width: `${row.score}%` }"></div>
      </div>
      <p v-if="showHelp" class="help">{{ row.help }}</p>
    </li>
  </ul>
</template>

<style scoped>
.breakdown {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--s3);
}

.row {
  display: grid;
  gap: var(--s1);
  padding: var(--s2);
  border-radius: var(--radius-sm);
}

.row.is-highlighted {
  background: var(--accent-soft);
}

.row-head {
  display: flex;
  align-items: center;
  gap: var(--s2);
  flex-wrap: wrap;
}

.label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--ink);
}

.highlight-tag {
  padding-top: 0;
  padding-bottom: 0;
}

.score {
  margin-left: auto;
  font-size: var(--text-sm);
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.score-of {
  color: var(--quiet);
}

.track {
  height: 6px;
  border-radius: 999px;
  background: var(--line-soft);
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
}

.help {
  font-size: var(--text-xs);
  color: var(--muted);
}
</style>
