<script setup lang="ts">
import { computed } from 'vue';
import { describeShot, formatShotTime, STROKE_LABELS } from '../domain/coaching';
import type { Shot } from '../domain/session';

const props = defineProps<{
  shots: Shot[];
  selectedId: string | null;
  title: string;
  removable: boolean;
  showSimilarity?: boolean;
}>();

const emit = defineEmits<{
  select: [id: string];
  remove: [id: string];
  compare: [];
}>();

const cards = computed(() => props.shots.map((shot, index) => ({
  shot,
  rank: index + 1,
  strokeLabel: STROKE_LABELS[shot.stroke],
  time: formatShotTime(shot.timestampSeconds),
  issue: describeShot(shot).mainIssue,
  poster: shot.media?.posterUrl ?? null,
  selected: shot.id === props.selectedId,
})));

const countLabel = computed(() => {
  const n = props.shots.length;
  return `${n} ${n === 1 ? 'shot' : 'shots'}`;
});
</script>

<template>
  <section class="strip panel" :aria-label="title">
    <header class="strip-head">
      <div>
        <p class="eyebrow">{{ title }}</p>
        <p v-if="shots.length > 0" class="count">{{ countLabel }}</p>
      </div>
      <button
        v-if="shots.length > 0"
        type="button"
        class="compare text-button"
        @click="emit('compare')"
      >
        Compare to best
      </button>
    </header>

    <p v-if="shots.length === 0" class="empty">
      Pick a shot and choose Find similar shots to see the same mistake elsewhere.
    </p>

    <ul v-else class="cards" role="list">
      <li
        v-for="card in cards"
        :key="card.shot.id"
        class="card"
        :class="{ 'is-selected': card.selected }"
      >
        <button
          type="button"
          class="card-body"
          :aria-pressed="card.selected"
          :aria-label="`Shot ${card.shot.number}, ${card.strokeLabel} at ${card.time}, ${card.issue}`"
          @click="emit('select', card.shot.id)"
        >
          <img
            v-if="card.poster"
            class="thumb"
            :src="card.poster"
            alt=""
            loading="lazy"
          />
          <span v-else class="thumb thumb-empty" aria-hidden="true">
            {{ card.strokeLabel }}
          </span>
          <span class="meta">
            <span class="line">
              <span class="number">Shot {{ card.shot.number }}</span>
              <span class="time">{{ card.time }}</span>
            </span>
            <span class="stroke">{{ card.strokeLabel }}</span>
            <span class="issue">{{ card.issue }}</span>
            <span v-if="showSimilarity" class="similarity">
              Match #{{ card.rank }}
            </span>
          </span>
        </button>
        <button
          v-if="removable"
          type="button"
          class="remove"
          :aria-label="`Remove shot ${card.shot.number} from this set`"
          @click="emit('remove', card.shot.id)"
        >
          <span aria-hidden="true">&times;</span>
          <span class="remove-text">Remove</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.strip {
  padding: var(--s4);
  display: flex;
  flex-direction: column;
  gap: var(--s3);
}

.strip-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s3);
}

.count {
  font-size: var(--text-sm);
  color: var(--muted);
}

.empty {
  color: var(--muted);
  font-size: var(--text-sm);
  padding: var(--s3) 0;
}

.cards {
  list-style: none;
  margin: 0;
  padding: 0 0 var(--s1);
  display: flex;
  gap: var(--s3);
  overflow-x: auto;
  scroll-snap-type: x proximity;
}

.card {
  position: relative;
  flex: 0 0 180px;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius);
  background: var(--surface);
  overflow: hidden;
}

.card.is-selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.card-body {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: none;
  text-align: left;
  color: var(--ink);
}

.card-body:hover .thumb-empty {
  background: var(--accent-soft);
}

.thumb {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  background: var(--surface-2);
}

.thumb-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--quiet);
  font-size: var(--text-sm);
  font-weight: 500;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--s2) var(--s3) var(--s3);
}

.line {
  display: flex;
  justify-content: space-between;
  gap: var(--s2);
}

.number {
  font-weight: 600;
  font-size: var(--text-md);
}

.time,
.stroke {
  color: var(--muted);
  font-size: var(--text-sm);
}

.issue {
  color: var(--issue);
  font-size: var(--text-sm);
  font-weight: 500;
}

.similarity {
  color: var(--quiet);
  font-size: var(--text-xs);
}

.remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--s1);
  min-height: var(--tap);
  margin: 0 var(--s2) var(--s2);
  padding: 0 var(--s2);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--muted);
  font-size: var(--text-sm);
  font-weight: 500;
}

.remove:hover {
  color: var(--issue);
  background: var(--issue-soft);
}
</style>
