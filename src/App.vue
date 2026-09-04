<script setup lang="ts">
import { computed, onMounted, reactive, ref, shallowRef, watch } from 'vue';
import { createReplayCapabilities } from './capabilities/replayCapabilities';
import CompareToBestPanel from './components/CompareToBestPanel.vue';
import CourtMap from './components/CourtMap.vue';
import DeveloperDrawer, {
  type CapabilitySummary,
  type WebMcpStatus,
} from './components/DeveloperDrawer.vue';
import NextSessionCard from './components/NextSessionCard.vue';
import PlayerHeader from './components/PlayerHeader.vue';
import SessionShotRail from './components/SessionShotRail.vue';
import ShotInsightCard from './components/ShotInsightCard.vue';
import ShotMediaViewer from './components/ShotMediaViewer.vue';
import SimilarShotsStrip from './components/SimilarShotsStrip.vue';
import { useWebMcpCapabilities } from './composables/useWebMcpCapabilities';
import {
  biggestDifference,
  coachMessage,
  describeShot,
  METRIC_LABELS,
  strokePlural,
} from './domain/coaching';
import {
  bestShots,
  compareShotSets,
  demoSession,
  findSimilarShots,
  getShot,
  type MetricName,
  type Shot,
  type ShotSetComparison,
  type TennisSession,
} from './domain/session';
import {
  fetchSession,
  parseSession,
  readSessionParam,
} from './domain/sessionLoader';
import { createReplayState } from './state/replayState';
import { readViewMode, withViewMode, type ViewMode } from './state/viewMode';

const session = shallowRef<TennisSession>(demoSession);
const state = reactive(createReplayState(demoSession));
state.lastAgentAction = coachMessage.welcome();
const sessionSource = ref('Demo fixture');
const loadingNotice = ref<string | null>(null);
const sessionNotice = ref<string | null>(null);
const sessionError = ref<string | null>(null);
const uiNotice = ref<string | null>(null);
const detailsOpen = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const mode = ref<ViewMode>(readViewMode(window.location.search));
const capabilities = createReplayCapabilities(() => session.value, state);
const webMcp = useWebMcpCapabilities(
  capabilities,
  () => state.selectedShotId,
);

// ---------------------------------------------------------------------------
// Session loading (link, hidden file input, invisible drag-drop)
// ---------------------------------------------------------------------------

function applySession(next: TennisSession, source: string) {
  session.value = next;
  Object.assign(state, createReplayState(next));
  state.lastAgentAction = coachMessage.sessionLoaded(next.title, next.shots.length);
  sessionSource.value = source;
  sessionNotice.value = null;
  sessionError.value = null;
  comparison.value = null;
  similarAnchorId.value = null;
}

function describeError(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

onMounted(async () => {
  const sessionRef = readSessionParam(window.location.search);
  if (!sessionRef) {
    return;
  }
  loadingNotice.value = 'Loading your practice session…';
  try {
    applySession(await fetchSession(sessionRef), 'Link');
  } catch (cause) {
    sessionNotice.value = "We couldn't load that practice session. Showing the demo session instead.";
    sessionError.value = describeError(cause);
  } finally {
    loadingNotice.value = null;
  }
});

async function loadSessionFile(file: File) {
  try {
    applySession(parseSession(JSON.parse(await file.text())), file.name);
  } catch (cause) {
    sessionNotice.value = "We couldn't read that session file. Keeping the current session.";
    sessionError.value = describeError(cause);
  }
}

function onFilePicked(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    void loadSessionFile(file);
  }
  (event.target as HTMLInputElement).value = '';
}

function onDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    void loadSessionFile(file);
  }
}

// ---------------------------------------------------------------------------
// Header actions
// ---------------------------------------------------------------------------

function setMode(next: ViewMode) {
  mode.value = next;
  const { pathname, search, hash } = window.location;
  window.history.replaceState(window.history.state, '', `${pathname}${withViewMode(search, next)}${hash}`);
}

async function copyLink() {
  const clipboard = navigator.clipboard;
  if (clipboard && typeof clipboard.writeText === 'function') {
    try {
      await clipboard.writeText(window.location.href);
      uiNotice.value = 'Session link copied. Share it with your coach or a practice partner.';
      return;
    } catch {
      // fall through to the manual hint
    }
  }
  uiNotice.value = 'Copy the link from your address bar to share this session.';
}

// ---------------------------------------------------------------------------
// Shots, selection and the similar-shots set (shared with the coach)
// ---------------------------------------------------------------------------

const selectedShot = computed<Shot | null>(() => (state.selectedShotId
  ? getShot(session.value, state.selectedShotId)
  : null));

const coachSubset = computed(() => state.visibleShotIds.length > 0);

const displayedShots = computed<Shot[]>(() => (coachSubset.value
  ? state.visibleShotIds.map((id) => getShot(session.value, id))
  : session.value.shots));

type SetOrigin = 'coach' | 'you';
const similarOrigin = ref<SetOrigin>('coach');
const similarAnchorId = ref<string | null>(null);
let pendingOrigin: SetOrigin | 'keep' | null = null;

// Any write to visibleShotIds that this component did not announce came from the coach.
watch(() => state.visibleShotIds, () => {
  if (pendingOrigin === 'keep') {
    pendingOrigin = null;
    return;
  }
  similarOrigin.value = pendingOrigin ?? 'coach';
  if (similarOrigin.value === 'coach') {
    similarAnchorId.value = null;
  }
  pendingOrigin = null;
});

const similarShots = computed<Shot[]>(() => (coachSubset.value
  ? displayedShots.value.filter((shot) => shot.id !== similarAnchorId.value)
  : []));

const similarTitle = computed(() => {
  if (similarOrigin.value === 'coach' && similarShots.value.length > 0) {
    const count = similarShots.value.length;
    return `Coach is showing ${count} ${count === 1 ? 'shot' : 'shots'}`;
  }
  return 'Similar shots';
});

function selectShot(shotId: string) {
  state.selectedShotId = shotId;
  state.lastAgentAction = coachMessage.selected(getShot(session.value, shotId));
}

function findSimilar() {
  const anchor = selectedShot.value;
  if (!anchor) {
    return;
  }
  const matches = findSimilarShots(session.value, anchor.id);
  pendingOrigin = 'you';
  similarAnchorId.value = anchor.id;
  state.visibleShotIds = [anchor.id, ...matches.map((shot) => shot.id)];
  state.lastAgentAction = `Showing ${matches.length} ${strokePlural(anchor.stroke, matches.length)} that look like shot ${anchor.number}.`;
}

function removeFromSet(shotId: string) {
  pendingOrigin = 'keep';
  state.visibleShotIds = state.visibleShotIds.filter((id) => id !== shotId);
  const shot = getShot(session.value, shotId);
  state.lastAgentAction = `Removed shot ${shot.number} from the set.`;
}

function showAllShots() {
  pendingOrigin = 'keep';
  state.visibleShotIds = [];
  state.highlightedMetrics = [];
  similarAnchorId.value = null;
  state.lastAgentAction = coachMessage.reset();
}

// ---------------------------------------------------------------------------
// Compare to best
// ---------------------------------------------------------------------------

interface ComparisonView {
  result: ShotSetComparison;
  problemShots: Shot[];
  referenceShots: Shot[];
}

const comparison = ref<ComparisonView | null>(null);

function compareToBest() {
  const anchor = selectedShot.value;
  if (!anchor) {
    return;
  }
  const problemShots = coachSubset.value ? displayedShots.value : [anchor];
  const problemIds = new Set(problemShots.map((shot) => shot.id));
  const referenceShots = bestShots(session.value, anchor.stroke, 3)
    .filter((shot) => !problemIds.has(shot.id));
  if (referenceShots.length === 0) {
    state.lastAgentAction = `There are no other ${strokePlural(anchor.stroke)} in this session to compare against.`;
    return;
  }
  const result = compareShotSets(
    session.value,
    problemShots.map((shot) => shot.id),
    referenceShots.map((shot) => shot.id),
  );
  comparison.value = { result, problemShots, referenceShots };
  const { metric } = biggestDifference(result);
  state.lastAgentAction = `${METRIC_LABELS[metric]} is the biggest difference between these ${strokePlural(anchor.stroke)} and your best ones.`;
}

function clearComparison() {
  comparison.value = null;
  state.lastAgentAction = 'Comparison cleared.';
}

const comparisonIds = computed(() => comparison.value?.result.comparisonIds ?? []);

// ---------------------------------------------------------------------------
// Next practice focus
// ---------------------------------------------------------------------------

const suggestedFocus = computed<MetricName | null>(() => (selectedShot.value
  ? describeShot(selectedShot.value).primaryMetric
  : null));

function setFocus(metric: MetricName) {
  state.coachingPlan.focus = metric;
  state.coachingPlan.note = '';
  state.lastAgentAction = coachMessage.focusSaved(metric);
}

function clearFocus() {
  state.coachingPlan.focus = null;
  state.coachingPlan.note = '';
  state.lastAgentAction = 'Next-practice focus cleared.';
}

// ---------------------------------------------------------------------------
// Court panel: a small contextual mini-map in Analysis and Developer modes,
// never in Player mode (spec 7, 10A, 27 step 9). Every session carries court
// x/y, so the panel always renders there; the caption states the source
// truthfully, and synthetic sessions are drawn as illustrative (spec 4, 11).
// ---------------------------------------------------------------------------

const showCourt = computed(() => mode.value !== 'player' && session.value.shots.length > 0);
const courtSource = computed(() => session.value.courtPositions ?? null);

// ---------------------------------------------------------------------------
// Coach update + developer drawer
// ---------------------------------------------------------------------------

const activity = ref<string[]>([]);
watch(() => state.lastAgentAction, (entry) => {
  activity.value.unshift(entry);
  if (activity.value.length > 30) {
    activity.value.length = 30;
  }
}, { immediate: true });

const webMcpStatus = computed<WebMcpStatus>(() => ({
  supported: webMcp.supported.value,
  surface: webMcp.surface.value,
  registered: webMcp.registered.value,
  unavailable: webMcp.unavailable.value.map((entry) => ({ id: entry.id, reason: entry.reason ?? '' })),
  error: webMcp.error.value,
}));

const capabilitySummaries: CapabilitySummary[] = capabilities.map((capability) => ({
  id: capability.id,
  title: capability.title ?? capability.id,
  effect: capability.effect,
}));

const durationLabel = computed(() => {
  const minutes = session.value.durationMinutes;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) {
    return `${minutes} min`;
  }
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
});
</script>

<template>
  <main
    class="page"
    :class="{ 'has-drawer': mode === 'developer' }"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <PlayerHeader
      :session="session"
      :focus="state.coachingPlan.focus"
      :similar-count="similarShots.length"
      :mode="mode"
      :web-mcp-ready="webMcp.supported.value"
      @import="fileInput?.click()"
      @copy-link="copyLink"
      @details="detailsOpen = !detailsOpen"
      @set-mode="setMode"
    />
    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      hidden
      @change="onFilePicked"
    >

    <p v-if="loadingNotice" class="session-notice" role="status">
      {{ loadingNotice }}
    </p>
    <p v-if="sessionNotice" class="session-notice is-issue" role="alert">
      {{ sessionNotice }}
      <code v-if="mode === 'developer' && sessionError" class="raw-error">{{ sessionError }}</code>
    </p>
    <p v-if="uiNotice" class="session-notice" role="status">
      {{ uiNotice }}
    </p>

    <section v-if="detailsOpen" class="panel details" aria-label="Session details">
      <div class="details-head">
        <h2>Session details</h2>
        <button type="button" class="text-button" @click="detailsOpen = false">Close</button>
      </div>
      <dl class="details-list">
        <div><dt>Title</dt><dd>{{ session.title }}</dd></div>
        <div><dt>Date</dt><dd>{{ session.dateLabel }}</dd></div>
        <div><dt>Shots</dt><dd>{{ session.shots.length }}</dd></div>
        <div><dt>Duration</dt><dd>{{ durationLabel }}</dd></div>
        <div><dt>Share id</dt><dd>{{ session.id }}</dd></div>
      </dl>
    </section>

    <div class="workspace">
      <div class="rail-slot">
        <SessionShotRail
          :shots="session.shots"
          :displayed-shots="displayedShots"
          :selected-id="state.selectedShotId"
          :coach-subset="coachSubset"
          :subset-origin="similarOrigin"
          :duration-minutes="session.durationMinutes"
          @select="selectShot"
          @show-all="showAllShots"
        />
      </div>

      <div class="center">
        <ShotMediaViewer
          class="viewer-slot"
          :shot="selectedShot"
          :session="session"
        />
        <section class="panel coach-update" aria-live="polite">
          <p class="eyebrow">Coach update</p>
          <p class="coach-update-text">{{ state.lastAgentAction }}</p>
        </section>
      </div>

      <div class="coaching">
        <ShotInsightCard
          class="insight-slot"
          :shot="selectedShot"
          :highlighted="state.highlightedMetrics"
          :mode="mode"
          @find-similar="findSimilar"
          @make-focus="setFocus"
        />
        <CompareToBestPanel
          class="compare-slot"
          :problem-shots="comparison?.problemShots ?? (selectedShot ? [selectedShot] : [])"
          :reference-shots="comparison?.referenceShots ?? []"
          :comparison="comparison?.result ?? null"
          :stroke="selectedShot?.stroke ?? null"
          :mode="mode"
          @compare="compareToBest"
          @clear="clearComparison"
        />
        <NextSessionCard
          class="next-slot"
          :plan="state.coachingPlan"
          :suggested-focus="suggestedFocus"
          :mode="mode"
          @set-focus="setFocus"
          @clear-focus="clearFocus"
        />
        <section v-if="showCourt" class="panel court-panel" aria-label="Court">
          <p class="eyebrow">Court</p>
          <CourtMap
            :shots="displayedShots"
            :selected-id="state.selectedShotId"
            :comparison-ids="comparisonIds"
            :source="courtSource"
          />
        </section>
      </div>

      <SimilarShotsStrip
        class="strip-slot"
        :shots="similarShots"
        :selected-id="state.selectedShotId"
        :title="similarTitle"
        :removable="true"
        :show-similarity="mode !== 'player'"
        @select="selectShot"
        @remove="removeFromSet"
        @compare="compareToBest"
      />
    </div>

    <div class="drawer-slot">
      <DeveloperDrawer
        :open="mode === 'developer'"
        :web-mcp="webMcpStatus"
        :capabilities="capabilitySummaries"
        :session-id="session.id"
        :session-source="sessionSource"
        :activity="activity"
        @close="setMode('player')"
      />
    </div>
  </main>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--s4);
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--s4);
  overflow-x: hidden;
}

.session-notice {
  padding: var(--s3) var(--s4);
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent-ink);
  font-size: var(--text-sm);
}
.session-notice.is-issue {
  background: var(--issue-soft);
  color: var(--issue);
}
.raw-error {
  display: block;
  margin-top: var(--s2);
  font-size: var(--text-xs);
  color: var(--muted);
  overflow-wrap: anywhere;
}

.details {
  padding: var(--s4);
}
.details-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s3);
}
.details-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--s3);
  margin: var(--s3) 0 0;
}
.details-list dt {
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.details-list dd {
  margin: 0;
  overflow-wrap: anywhere;
}

/* Three columns: shots | video + coach update | coaching rail, strip below. */
.workspace {
  display: grid;
  grid-template-columns: 272px minmax(0, 1fr) 336px;
  grid-template-areas:
    "rail center coaching"
    "strip strip strip";
  gap: var(--s4);
  align-items: start;
  min-width: 0;
}

.rail-slot {
  grid-area: rail;
  position: sticky;
  top: var(--s4);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - var(--s6));
  min-width: 0;
}
.rail-slot > .rail {
  min-height: 0;
}

.center {
  grid-area: center;
  display: flex;
  flex-direction: column;
  gap: var(--s4);
  min-width: 0;
}

.coaching {
  grid-area: coaching;
  display: flex;
  flex-direction: column;
  gap: var(--s4);
  min-width: 0;
}

.strip-slot {
  grid-area: strip;
  min-width: 0;
}

.coach-update {
  display: flex;
  flex-direction: column;
  gap: var(--s1);
  padding: var(--s3) var(--s4);
  border-left: 3px solid var(--accent);
}
.coach-update-text {
  font-size: var(--text-md);
  color: var(--ink);
}

.court-panel {
  display: flex;
  flex-direction: column;
  gap: var(--s2);
  padding: var(--s4);
}

/* Developer drawer: fixed at the right edge. At desktop widths the page
   reserves its width so it sits beside the coaching column, not over it. */
.drawer-slot {
  position: fixed;
  top: var(--s4);
  right: var(--s4);
  bottom: var(--s4);
  z-index: 20;
  width: min(420px, calc(100vw - var(--s6)));
  pointer-events: none;
}
.drawer-slot > * {
  max-height: 100%;
  overflow-y: auto;
  pointer-events: auto;
}

@media (min-width: 1100px) {
  .page.has-drawer {
    max-width: none;
    padding-right: calc(420px + var(--s4) + var(--s4));
  }
}

@media (max-width: 1099px) {
  .workspace {
    grid-template-columns: minmax(0, 1fr) 320px;
    grid-template-areas:
      "center coaching"
      "rail coaching"
      "strip strip";
  }
  .rail-slot {
    position: static;
    max-height: 60vh;
  }
}

/* Single column (spec 8): video, coaching takeaway, shots, next practice. */
@media (max-width: 799px) {
  .page {
    padding: var(--s3);
  }
  .workspace {
    display: flex;
    flex-direction: column;
  }
  .center,
  .coaching {
    display: contents;
  }
  .viewer-slot { order: 1; }
  .coach-update { order: 2; }
  .insight-slot { order: 3; }
  .rail-slot { order: 4; max-height: 50vh; }
  .next-slot { order: 5; }
  .compare-slot { order: 6; }
  .court-panel { order: 7; }
  .strip-slot { order: 8; }
}
</style>
