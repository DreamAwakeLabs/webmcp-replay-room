<script setup lang="ts">
import { computed, onMounted, reactive, ref, shallowRef } from 'vue';
import { createReplayCapabilities } from './capabilities/replayCapabilities';
import { useWebMcpCapabilities } from './composables/useWebMcpCapabilities';
import {
  demoSession,
  getShot,
  METRIC_NAMES,
  type MetricName,
  type TennisSession,
} from './domain/session';
import {
  fetchSession,
  parseSession,
  readSessionParam,
} from './domain/sessionLoader';
import { createReplayState } from './state/replayState';

const session = shallowRef<TennisSession>(demoSession);
const state = reactive(createReplayState(demoSession));
const sessionNotice = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const capabilities = createReplayCapabilities(() => session.value, state);
const webMcp = useWebMcpCapabilities(
  capabilities,
  () => state.selectedShotId,
);

function applySession(next: TennisSession, source: string) {
  session.value = next;
  Object.assign(state, createReplayState(next));
  state.lastAgentAction = `Loaded ${next.shots.length}-shot session "${next.title}" from ${source}.`;
  sessionNotice.value = null;
}

function describeError(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

onMounted(async () => {
  const sessionRef = readSessionParam(window.location.search);
  if (!sessionRef) {
    return;
  }
  try {
    applySession(await fetchSession(sessionRef), 'link');
  } catch (cause) {
    sessionNotice.value = `Could not load the linked session (${describeError(cause)}) — showing the demo session instead.`;
  }
});

async function loadSessionFile(file: File) {
  try {
    applySession(parseSession(JSON.parse(await file.text())), file.name);
  } catch (cause) {
    sessionNotice.value = `Could not load ${file.name}: ${describeError(cause)}`;
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

const selectedShot = computed(() => state.selectedShotId
  ? getShot(session.value, state.selectedShotId)
  : null);

const displayedShots = computed(() => state.visibleShotIds.length > 0
  ? state.visibleShotIds.map((id) => getShot(session.value, id))
  : session.value.shots);

const visibleMode = computed(() => state.visibleShotIds.length > 0);

function selectShot(shotId: string) {
  state.selectedShotId = shotId;
  state.lastAgentAction = `You selected ${shotId}. Ask the agent to investigate what feels wrong.`;
}

function showAllShots() {
  state.visibleShotIds = [];
  state.highlightedMetrics = [];
  state.lastAgentAction = 'Human reset the workspace to the full session.';
}

function metricPercent(metric: MetricName) {
  return Math.round((selectedShot.value?.metrics[metric] ?? 0) * 100);
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}
</script>

<template>
  <main
    class="shell"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <header class="topbar">
      <div class="brand-lockup">
        <div class="mark">DA</div>
        <div>
          <p class="eyebrow">DREAM AWAKE LABS · WEBMCP CHALLENGE</p>
          <h1>Replay Room</h1>
        </div>
      </div>
      <div class="topbar-meta">
        <span
          class="status-pill"
          :class="webMcp.supported.value ? 'is-live' : 'is-demo'"
        >
          <span class="status-dot" />
          {{ webMcp.supported.value ? 'WebMCP ready' : 'WebMCP unavailable · UI demo' }}
        </span>
        <span class="session-id">{{ session.id }}</span>
        <button
          class="text-button"
          type="button"
          @click="fileInput?.click()"
        >
          Load JSON
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="application/json,.json"
          hidden
          @change="onFilePicked"
        >
      </div>
    </header>

    <p v-if="sessionNotice" class="session-notice" role="alert">
      {{ sessionNotice }}
    </p>

    <section class="workspace-grid">
      <aside class="left-rail panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">SESSION</p>
            <h2>{{ session.title }}</h2>
          </div>
          <button
            v-if="visibleMode"
            class="text-button"
            type="button"
            @click="showAllShots"
          >
            Show all
          </button>
        </div>

        <div class="session-stats">
          <span>{{ session.shots.length }} shots</span>
          <span>{{ session.durationMinutes }} min</span>
          <span>{{ session.dateLabel }}</span>
        </div>

        <div class="shot-list" aria-label="Session shots">
          <button
            v-for="shot in displayedShots"
            :key="shot.id"
            class="shot-card"
            :class="{
              selected: state.selectedShotId === shot.id,
              problem: shot.outcome === 'off-balance' || shot.outcome === 'mishit',
            }"
            type="button"
            @click="selectShot(shot.id)"
          >
            <span class="shot-number">{{ String(shot.number).padStart(2, '0') }}</span>
            <span class="shot-main">
              <strong>{{ shot.stroke }}</strong>
              <small>{{ shot.outcome }}</small>
            </span>
            <span class="shot-time">{{ formatTime(shot.timestampSeconds) }}</span>
          </button>
        </div>
      </aside>

      <section class="center-stage">
        <div class="viewer panel">
          <div class="viewer-toolbar">
            <div>
              <p class="eyebrow">CURRENT REVIEW</p>
              <h2 v-if="selectedShot">
                Shot {{ selectedShot.number }} · {{ selectedShot.stroke }}
              </h2>
              <h2 v-else>Select a shot</h2>
            </div>
            <div v-if="selectedShot" class="outcome-chip">
              {{ selectedShot.outcome }}
            </div>
          </div>

          <div class="court-frame">
            <div class="court">
              <div class="court-line center-line" />
              <div class="court-line service-line service-line-top" />
              <div class="court-line service-line service-line-bottom" />
              <div class="net" />
              <div
                v-if="selectedShot"
                class="player-marker"
                :style="{
                  left: `${selectedShot.court.x}%`,
                  top: `${selectedShot.court.y}%`,
                }"
              >
                <span class="player-core" />
                <span class="impact-ring" />
              </div>
              <div class="ball-trace">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
            <div class="frame-overlay top-left">
              <span>CAM 01</span>
              <span v-if="selectedShot">T+ {{ formatTime(selectedShot.timestampSeconds) }}</span>
            </div>
            <div class="frame-overlay bottom-left">POSE + CONTACT FUSED</div>
          </div>

          <div v-if="selectedShot" class="coach-note">
            <span class="note-index">COACH NOTE</span>
            <p>{{ selectedShot.note }}</p>
          </div>
        </div>

        <div class="activity-strip">
          <div class="agent-orb">✦</div>
          <div>
            <p class="eyebrow">WORKSPACE ACTIVITY</p>
            <p>{{ state.lastAgentAction }}</p>
          </div>
        </div>
      </section>

      <aside class="right-rail">
        <section class="panel metric-panel">
          <div class="panel-heading compact">
            <div>
              <p class="eyebrow">TECHNIQUE SIGNAL</p>
              <h2>Shot metrics</h2>
            </div>
            <span class="metric-scale">0—100</span>
          </div>

          <div v-if="selectedShot" class="metrics">
            <div
              v-for="metric in METRIC_NAMES"
              :key="metric"
              class="metric-row"
              :class="{ highlighted: state.highlightedMetrics.includes(metric) }"
            >
              <div class="metric-label">
                <span>{{ metric }}</span>
                <strong>{{ metricPercent(metric) }}</strong>
              </div>
              <div class="metric-track">
                <span :style="{ width: `${metricPercent(metric)}%` }" />
              </div>
            </div>
          </div>
        </section>

        <section class="panel coaching-panel">
          <p class="eyebrow">PERSISTENT OUTCOME</p>
          <h2>Next session</h2>
          <div v-if="state.coachingPlan.focus" class="focus-card">
            <span class="focus-label">FOCUS</span>
            <strong>{{ state.coachingPlan.focus }}</strong>
            <p>{{ state.coachingPlan.note || 'Carry this emphasis into the next coaching session.' }}</p>
          </div>
          <div v-else class="focus-empty">
            <span>+</span>
            <p>Ask the agent to make a discovered issue your next-session focus.</p>
          </div>
        </section>

        <section class="panel tools-panel">
          <div class="panel-heading compact">
            <div>
              <p class="eyebrow">AGENT SURFACE</p>
              <h2>Capabilities</h2>
            </div>
            <span class="tool-count">{{ webMcp.registered.value.length }}/{{ capabilities.length }}</span>
          </div>
          <div class="tool-list">
            <div
              v-for="capability in capabilities"
              :key="capability.id"
              class="tool-row"
            >
              <span
                class="tool-led"
                :class="{ enabled: webMcp.registered.value.includes(capability.id) }"
              />
              <code>{{ capability.id }}</code>
              <span class="effect-tag">{{ capability.effect }}</span>
            </div>
          </div>
          <p v-if="webMcp.error.value" class="error-copy">{{ webMcp.error.value }}</p>
        </section>
      </aside>
    </section>

    <footer class="footer-note">
      <span>REPLAY ROOM / CHALLENGE BUILD</span>
      <span>?session=&lt;id or URL&gt; · drop a session JSON anywhere · demo fixture otherwise</span>
    </footer>
  </main>
</template>
