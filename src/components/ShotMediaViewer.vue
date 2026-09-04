<script setup lang="ts">
import { computed } from 'vue';
import {
  describeShot,
  formatShotTime,
  isProblemOutcome,
  OUTCOME_LABELS,
  STROKE_LABELS,
} from '../domain/coaching';
import type { Shot, TennisSession } from '../domain/session';

const props = defineProps<{
  shot: Shot | null;
  session: TennisSession;
}>();

const summary = computed(() => {
  if (!props.shot) {
    return '';
  }
  const { number, stroke, timestampSeconds } = props.shot;
  return `Shot ${number} · ${STROKE_LABELS[stroke]} · ${formatShotTime(timestampSeconds)}`;
});

const insight = computed(() => (props.shot ? describeShot(props.shot) : null));

const clipUrl = computed(() => props.shot?.media?.clipUrl ?? null);
const posterUrl = computed(() => props.shot?.media?.posterUrl ?? null);

const mediaLabel = computed(() => {
  if (!props.shot) {
    return '';
  }
  const stroke = STROKE_LABELS[props.shot.stroke].toLowerCase();
  return `Shot ${props.shot.number} ${stroke} from ${props.session.title}`;
});

const outcomeChipClass = computed(() => {
  if (!props.shot) {
    return '';
  }
  return isProblemOutcome(props.shot.outcome) ? 'is-issue' : 'is-strong';
});
</script>

<template>
  <section class="viewer panel" aria-label="Selected shot">
    <div class="hero">
      <video
        v-if="shot && clipUrl"
        class="media"
        controls
        playsinline
        preload="metadata"
        :src="clipUrl"
        :poster="posterUrl ?? undefined"
        :aria-label="`Video of ${mediaLabel}`"
      />
      <img
        v-else-if="shot && posterUrl"
        class="media"
        :src="posterUrl"
        :alt="`Key frame of ${mediaLabel}`"
      />
      <div v-else-if="shot" class="placeholder" data-test="placeholder">
        <p class="placeholder-title">Video not captured for this shot</p>
        <p class="placeholder-summary">{{ summary }}</p>
        <p v-if="insight" class="placeholder-issue">{{ insight.mainIssue }}</p>
      </div>
      <div v-else class="placeholder" data-test="empty">
        <p class="placeholder-title">Select a shot to review</p>
      </div>
    </div>

    <div class="caption">
      <template v-if="shot">
        <p class="summary" data-test="summary">{{ summary }}</p>
        <span class="chip" :class="outcomeChipClass" data-test="outcome">
          {{ OUTCOME_LABELS[shot.outcome] }}
        </span>
      </template>
      <p v-else class="summary muted">Select a shot to review</p>
    </div>
  </section>
</template>

<style scoped>
.viewer {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.hero {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--surface-2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.media {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: var(--ink);
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s2);
  padding: var(--s5);
  text-align: center;
  color: var(--muted);
}

.placeholder-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--ink);
}

.placeholder-summary {
  font-size: var(--text-md);
}

.placeholder-issue {
  font-size: var(--text-sm);
  color: var(--quiet);
}

.caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s3);
  flex-wrap: wrap;
  padding: var(--s3) var(--s4);
  border-top: 1px solid var(--line-soft);
  min-height: var(--tap);
}

.summary {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--ink);
}

.muted {
  color: var(--muted);
  font-weight: 500;
}
</style>
