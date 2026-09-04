<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  OUTCOME_LABELS,
  STROKE_LABELS,
  describeShot,
  formatShotTime,
  isProblemOutcome,
} from '../domain/coaching';
import type { Shot } from '../domain/session';

const props = defineProps<{
  /** Every shot in the session. */
  shots: Shot[];
  /** The subset the coach chose, or all shots. */
  displayedShots: Shot[];
  selectedId: string | null;
  coachSubset: boolean;
  /** Who narrowed the set: the coach (default) or the player. */
  subsetOrigin?: 'coach' | 'you';
  /** Session length when known; otherwise derived from the last shot time. */
  durationMinutes?: number;
}>();

const emit = defineEmits<{
  select: [id: string];
  'show-all': [];
}>();

type FilterId = 'all' | 'backhand' | 'forehand' | 'serve' | 'issues' | 'best';

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'backhand', label: 'Backhands' },
  { id: 'forehand', label: 'Forehands' },
  { id: 'serve', label: 'Serves' },
  { id: 'issues', label: 'Issues' },
  { id: 'best', label: 'Best' },
];

const filter = ref<FilterId>('all');

function matchesFilter(shot: Shot): boolean {
  switch (filter.value) {
    case 'all':
      return true;
    case 'issues':
      return isProblemOutcome(shot.outcome);
    case 'best':
      return describeShot(shot).isStrong;
    default:
      return shot.stroke === filter.value;
  }
}

const visibleShots = computed(() => props.displayedShots.filter(matchesFilter));

const durationLabel = computed(() => {
  const minutes = props.durationMinutes
    ?? Math.ceil(Math.max(0, ...props.shots.map((shot) => shot.timestampSeconds)) / 60);
  if (minutes <= 0) {
    return '';
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) {
    return `${minutes} min of play`;
  }
  const hourText = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  return rest === 0 ? `${hourText} of play` : `${hourText} ${rest} min of play`;
});

const countLabel = computed(() => {
  const count = props.shots.length;
  return `${count} ${count === 1 ? 'shot' : 'shots'}`;
});

const subsetLabel = computed(() => {
  const count = props.displayedShots.length;
  const shots = `${count} ${count === 1 ? 'shot' : 'shots'}`;
  return props.subsetOrigin === 'you' ? `Showing ${shots}` : `Coach is showing ${shots}`;
});

const emptyMessage = computed(() => {
  if (props.shots.length === 0) {
    return 'No shots in this session yet.';
  }
  if (props.displayedShots.length === 0) {
    return 'Coach has no shots to show right now.';
  }
  return 'No shots match this filter.';
});

function shotNumber(shot: Shot): string {
  return String(shot.number).padStart(2, '0');
}
</script>

<template>
  <section class="rail panel" aria-labelledby="shot-rail-heading">
    <header class="rail-head">
      <h2 id="shot-rail-heading">Shots</h2>
      <p class="summary">
        {{ countLabel }}<template v-if="durationLabel"> · {{ durationLabel }}</template>
      </p>
    </header>

    <div class="filters" role="group" aria-label="Filter shots">
      <button
        v-for="option in FILTERS"
        :key="option.id"
        type="button"
        class="filter"
        :class="{ 'is-active': filter === option.id }"
        :aria-pressed="filter === option.id"
        @click="filter = option.id"
      >
        {{ option.label }}
      </button>
    </div>

    <div v-if="coachSubset" class="coach-bar" role="status">
      <span>{{ subsetLabel }}</span>
      <button type="button" class="text-button" @click="emit('show-all')">Show all</button>
    </div>

    <ul v-if="visibleShots.length > 0" class="list" aria-label="Session shots">
      <li v-for="shot in visibleShots" :key="shot.id">
        <button
          type="button"
          class="row"
          :class="{ 'is-selected': shot.id === selectedId, 'is-issue': isProblemOutcome(shot.outcome) }"
          :aria-current="shot.id === selectedId ? 'true' : undefined"
          @click="emit('select', shot.id)"
        >
          <img
            v-if="shot.media?.posterUrl"
            class="thumb"
            :src="shot.media.posterUrl"
            :alt="`Shot ${shot.number}`"
            loading="lazy"
          />
          <span class="number">{{ shotNumber(shot) }}</span>
          <span class="body">
            <span class="title">{{ STROKE_LABELS[shot.stroke] }}</span>
            <span class="outcome">
              <span v-if="isProblemOutcome(shot.outcome)" class="issue-mark" aria-hidden="true">!</span>
              <span v-if="isProblemOutcome(shot.outcome)" class="sr-only">Issue:</span>
              {{ OUTCOME_LABELS[shot.outcome] }}
            </span>
          </span>
          <span class="time">{{ formatShotTime(shot.timestampSeconds) }}</span>
        </button>
      </li>
    </ul>
    <p v-else class="empty" role="status">{{ emptyMessage }}</p>
  </section>
</template>

<style scoped>
.rail {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: var(--s4);
  gap: var(--s3);
}

.rail-head {
  display: flex;
  flex-direction: column;
  gap: var(--s1);
}

.summary {
  color: var(--muted);
  font-size: var(--text-sm);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s1);
}

.filter {
  min-height: var(--tap);
  padding: 0 var(--s3);
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: var(--text-sm);
  font-weight: 500;
}

.filter:hover {
  color: var(--ink);
}

.filter.is-active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent-ink);
}

.coach-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s2);
  padding: var(--s1) var(--s2) var(--s1) var(--s3);
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent-ink);
  font-size: var(--text-sm);
  font-weight: 500;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--s1);
  overflow-y: auto;
  min-height: 0;
  flex: 1;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--s3);
  width: 100%;
  min-height: 44px;
  padding: var(--s2) var(--s3);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: none;
  text-align: left;
}

.row:hover {
  background: var(--surface-2);
}

.row.is-selected {
  background: var(--accent-soft);
  border-color: var(--accent);
}

.thumb {
  width: 56px;
  height: 40px;
  flex: 0 0 auto;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

.number {
  flex: 0 0 auto;
  min-width: 2ch;
  color: var(--quiet);
  font-size: var(--text-sm);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.title {
  font-weight: 600;
}

.outcome {
  display: inline-flex;
  align-items: center;
  gap: var(--s1);
  color: var(--muted);
  font-size: var(--text-sm);
}

.row.is-issue .outcome {
  color: var(--issue);
}

.issue-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: var(--issue-soft);
  color: var(--issue);
  font-size: var(--text-xs);
  font-weight: 700;
  line-height: 1;
}

.time {
  flex: 0 0 auto;
  color: var(--quiet);
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
}

.empty {
  padding: var(--s4);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--muted);
  font-size: var(--text-sm);
}
</style>
