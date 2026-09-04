<script setup lang="ts">
import { computed } from 'vue';
import type { CourtPositionSource, Shot } from '../domain/session';

const props = withDefaults(defineProps<{
  shots: Shot[];
  selectedId: string | null;
  comparisonIds: string[];
  compact?: boolean;
  /** Where court.x/y came from. Synthetic sessions (e.g. Tennisbot exports,
   *  which do no court tracking) are labelled illustrative, never measured. */
  source?: CourtPositionSource | null;
}>(), { compact: false, source: null });

const illustrative = computed(() => props.source === 'synthetic');
const caption = computed(() => illustrative.value
  ? 'Illustrative placement, court position not tracked'
  : 'Approximate positions');

/*
 * Single court in feet: 36 wide (doubles), 78 long, net across the middle.
 * Shot court.x/y are 0..100 percentages of the playing surface.
 */
const MARGIN = 6;
const WIDTH = 36;
const LENGTH = 78;
const VIEW_W = WIDTH + MARGIN * 2;
const VIEW_H = LENGTH + MARGIN * 2;
const LEFT = MARGIN;
const TOP = MARGIN;
const RIGHT = MARGIN + WIDTH;
const BOTTOM = MARGIN + LENGTH;
const NET_Y = TOP + LENGTH / 2;
const SINGLES_INSET = 4.5;
const SERVICE_DEPTH = 21;
const CENTER_X = LEFT + WIDTH / 2;
const CENTER_MARK = 1.5;

type Kind = 'selected' | 'comparison' | 'other';

interface Marker {
  id: string;
  number: number;
  cx: number;
  cy: number;
  kind: Kind;
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) {
    return 50;
  }
  return Math.min(100, Math.max(0, value));
}

const DRAW_ORDER: Record<Kind, number> = { other: 0, comparison: 1, selected: 2 };

const markers = computed<Marker[]>(() => {
  const comparison = new Set(props.comparisonIds);
  const list = props.shots.map((shot) => {
    let kind: Kind = 'other';
    if (shot.id === props.selectedId) {
      kind = 'selected';
    } else if (comparison.has(shot.id)) {
      kind = 'comparison';
    }
    return {
      id: shot.id,
      number: shot.number,
      cx: LEFT + (clamp(shot.court.x) / 100) * WIDTH,
      cy: TOP + (clamp(shot.court.y) / 100) * LENGTH,
      kind,
    };
  });
  // Selected shot is drawn last so it sits on top.
  return list.sort((a, b) => DRAW_ORDER[a.kind] - DRAW_ORDER[b.kind]);
});

const comparisonCount = computed(
  () => markers.value.filter((marker) => marker.kind === 'comparison').length,
);
const hasSelected = computed(
  () => markers.value.some((marker) => marker.kind === 'selected'),
);

const ariaLabel = computed(() => {
  const total = props.shots.length;
  const parts = [`Court map with ${total} ${total === 1 ? 'shot' : 'shots'}`];
  parts.push(hasSelected.value ? '1 selected' : 'none selected');
  if (comparisonCount.value > 0) {
    parts.push(`${comparisonCount.value} in comparison`);
  }
  return `${parts.join(', ')}. ${caption.value}.`;
});

function diamond(cx: number, cy: number, r: number): string {
  return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
}
</script>

<template>
  <figure class="court-map" :class="{ 'is-compact': compact, 'is-illustrative': illustrative }">
    <svg
      :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`"
      role="img"
      :aria-label="ariaLabel"
      class="court"
    >
      <title>Court map, {{ caption.toLowerCase() }}</title>
      <rect :x="LEFT" :y="TOP" :width="WIDTH" :height="LENGTH" class="surface" />
      <rect :x="LEFT" :y="TOP" :width="WIDTH" :height="LENGTH" class="line" />
      <line :x1="LEFT + SINGLES_INSET" :y1="TOP" :x2="LEFT + SINGLES_INSET" :y2="BOTTOM" class="line" />
      <line :x1="RIGHT - SINGLES_INSET" :y1="TOP" :x2="RIGHT - SINGLES_INSET" :y2="BOTTOM" class="line" />
      <line :x1="LEFT + SINGLES_INSET" :y1="NET_Y - SERVICE_DEPTH" :x2="RIGHT - SINGLES_INSET" :y2="NET_Y - SERVICE_DEPTH" class="line" />
      <line :x1="LEFT + SINGLES_INSET" :y1="NET_Y + SERVICE_DEPTH" :x2="RIGHT - SINGLES_INSET" :y2="NET_Y + SERVICE_DEPTH" class="line" />
      <line :x1="CENTER_X" :y1="NET_Y - SERVICE_DEPTH" :x2="CENTER_X" :y2="NET_Y + SERVICE_DEPTH" class="line" />
      <line :x1="CENTER_X" :y1="TOP" :x2="CENTER_X" :y2="TOP + CENTER_MARK" class="line" />
      <line :x1="CENTER_X" :y1="BOTTOM" :x2="CENTER_X" :y2="BOTTOM - CENTER_MARK" class="line" />
      <line :x1="LEFT - 1.5" :y1="NET_Y" :x2="RIGHT + 1.5" :y2="NET_Y" class="net" />

      <g v-for="marker in markers" :key="marker.id" :data-shot-id="marker.id" :data-kind="marker.kind">
        <polygon
          v-if="marker.kind === 'comparison'"
          :points="diamond(marker.cx, marker.cy, 1.8)"
          class="dot is-comparison"
        />
        <circle
          v-else
          :cx="marker.cx"
          :cy="marker.cy"
          :r="marker.kind === 'selected' ? 2 : 1.1"
          class="dot"
          :class="{ 'is-selected': marker.kind === 'selected' }"
        />
      </g>
    </svg>
    <figcaption class="legend">
      <span class="caption">{{ caption }}</span>
      <span class="key">
        <span class="swatch swatch-selected" aria-hidden="true" />Selected
      </span>
      <span v-if="comparisonCount > 0" class="key">
        <span class="swatch swatch-comparison" aria-hidden="true" />Comparison
      </span>
    </figcaption>
  </figure>
</template>

<style scoped>
.court-map {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--s2);
  width: 100%;
  max-width: 220px;
}

.court-map.is-compact {
  max-width: 140px;
}

.court {
  width: 100%;
  height: auto;
  display: block;
}

.surface {
  fill: var(--surface-2);
}

.line {
  fill: none;
  stroke: var(--line);
  stroke-width: 0.6;
  stroke-linecap: square;
}

.net {
  stroke: var(--muted);
  stroke-width: 0.8;
}

.dot {
  fill: var(--quiet);
  stroke: var(--surface);
  stroke-width: 0.4;
}

/* Synthetic sessions: hollow markers so the map reads as a sketch, not data. */
.court-map.is-illustrative .dot {
  fill-opacity: 0.16;
  stroke: var(--quiet);
  stroke-opacity: 0.35;
  stroke-width: 0.2;
}
.court-map.is-illustrative .dot.is-selected,
.court-map.is-illustrative .dot.is-comparison {
  fill-opacity: 1;
  stroke: none;
}

.dot.is-selected {
  fill: var(--accent);
}

.dot.is-comparison {
  fill: var(--strong);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s1) var(--s3);
  font-size: var(--text-xs);
  color: var(--muted);
}

.caption {
  font-weight: 500;
}

.key {
  display: inline-flex;
  align-items: center;
  gap: var(--s1);
  color: var(--quiet);
}

.swatch {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}

.swatch-comparison {
  border-radius: 0;
  transform: rotate(45deg);
  background: var(--strong);
}
</style>
