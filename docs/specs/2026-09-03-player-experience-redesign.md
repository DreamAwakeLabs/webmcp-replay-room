# Replay Room Player Experience Redesign

**Status:** Proposed  
**Date:** 2026-09-03  
**Scope:** Product UX, visual design, information architecture, court visualization, and progressive disclosure  
**Reference session:** `?session=tennisbot-20260706`

## 1. Summary

Replay Room currently proves the WebMCP interaction model well: a human can select a shot, an agent can inspect structured state, find similar shots, compare groups, alter the visible workspace, highlight metrics, and persist a next-session coaching focus.

The next design milestone is to make the product feel like something a tennis player would choose to use after practice, rather than a developer-facing demonstration of an agent interface.

The redesign should preserve the underlying agent-native architecture while changing the visible product hierarchy:

1. **Video or real shot imagery becomes the hero.**
2. **Coaching interpretation becomes more important than raw telemetry.**
3. **The court visualization becomes contextual rather than decorative unless it is backed by sufficiently rich spatial data.**
4. **Technical WebMCP and capability information moves behind an explicit developer/debug surface.**
5. **Players get one clear takeaway and one next action before they are asked to interpret multiple metrics.**
6. **Advanced analysis remains available through progressive disclosure rather than being removed.**

The recommended end state is a **player-first coaching workspace with optional Analysis and Developer modes**.

---

## 2. Problem statement

The existing interface communicates "sports analysis system" effectively, but several visible elements make it feel closer to an internal tool or hackathon control surface than a consumer coaching product:

- WebMCP status and implementation surface are shown prominently in the top bar.
- Session identifiers and JSON-loading controls sit beside the primary product branding.
- The capability registry is a full first-class panel in the main layout.
- The main visual is a synthetic top-down tennis court rather than footage of the user's actual stroke.
- Labels such as `CURRENT REVIEW`, `TECHNIQUE SIGNAL`, `AGENT SURFACE`, `WORKSPACE ACTIVITY`, and raw effect tags emphasize system state over player intent.
- Four technique metrics are presented with similar visual weight even when only one may explain the shot.
- The synthetic court contains UI language such as `CAM 01` and `POSE + CONTACT FUSED`, reinforcing a machine-vision/demo aesthetic.

None of these are architectural defects. They are information-hierarchy choices that were appropriate for proving the WebMCP concept and should now be revised for a wider audience.

### Desired perception shift

**From:**
> An AI/agent developer tool for inspecting tennis-shot data.

**To:**
> A personal tennis coach that helps me understand what happened, find the same mistake elsewhere, compare it with my better technique, and decide what to work on next.

---

## 3. Goals

### Primary goals

- Make the default experience immediately understandable to a recreational tennis player with no knowledge of AI agents, WebMCP, pose estimation, or developer tooling.
- Make real media the primary evidence whenever a session contains usable clips or frames.
- Reduce the cognitive burden of interpreting raw metrics.
- Make the core agent interaction feel collaborative and visual rather than chat-centric or automation-centric.
- Preserve the same semantic capabilities and WebMCP architecture underneath the redesigned UI.
- Support both casual players and advanced users/coaches without maintaining two separate applications.
- Make the product feel credible enough to show as a standalone sports product, not only as a hackathon submission.

### Secondary goals

- Improve tablet and narrower-desktop usability.
- Create clear places for future drill recommendations, trend views, pose overlays, and shot maps.
- Establish a visual language that can later extend to Tennisbot live coaching.
- Keep developer observability available without polluting the player experience.

---

## 4. Non-goals

This redesign does not require:

- replacing WebMCP or Agent Forge;
- changing the capability semantics solely for visual reasons;
- implementing a new pose-estimation pipeline;
- inventing precise ball trajectories when the session does not contain them;
- pretending synthetic court data is more accurate than it is;
- adding social/community features;
- adding account, billing, or onboarding flows;
- rebuilding the app in another framework.

The guiding rule is: **do not manufacture sports precision for visual polish.** If the data is not available, show a simpler truthful visualization.

---

## 5. Audience and modes

The same application should support three levels of use.

### 5.1 Player mode — default

**Audience:** recreational and competitive players who primarily want coaching feedback.

Player mode should emphasize:

- real video or freeze frames;
- simple labels;
- one primary issue;
- similar-shot examples;
- comparison with stronger shots;
- a next-session focus;
- optional drill recommendation.

Player mode should hide:

- WebMCP implementation surface;
- registered capability counts;
- effect classifications;
- raw session IDs unless needed for sharing/support;
- JSON loading controls except under a secondary menu;
- protocol/debug errors unless they block the user's task.

### 5.2 Analysis mode — optional

**Audience:** advanced players, coaches, technically curious users.

Analysis mode can expose:

- full metric breakdowns;
- court map / shot map;
- comparison deltas;
- detailed timestamps;
- pose/biomechanics overlays;
- grouped shot sets;
- confidence or source details when meaningful;
- session trends.

This should feel like an advanced coaching tool, not a software debugger.

### 5.3 Developer mode — hidden/explicit

**Audience:** WebMCP judges, developers, internal QA.

Developer mode preserves the useful existing visibility:

- WebMCP ready/unavailable state;
- bound surface (`document.modelContext`, legacy fallback, etc.);
- registered capability names;
- capability effects;
- unavailable capabilities and reasons;
- raw agent activity;
- session source and technical ID;
- loader/debug errors;
- optional capability invocation trace.

Possible access patterns:

- `?debug=1`;
- a keyboard shortcut;
- an item under a three-dot menu;
- a small "Developer" switch in settings.

**Recommendation:** support `?debug=1` immediately, with a UI toggle later.

---

## 6. Information hierarchy

The player-facing hierarchy should be:

1. **What shot am I looking at?**
2. **What happened?**
3. **What is the main thing to fix?**
4. **Does this happen elsewhere?**
5. **How is this different from my better shots?**
6. **What should I work on next?**
7. Detailed metrics and spatial analysis.
8. Developer/protocol information.

This is intentionally different from the current system-oriented hierarchy where session state, technique telemetry, WebMCP state, and capability registration are simultaneously visible.

---

## 7. Recommended default desktop layout

### Recommended layout: video-first coaching workspace

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Replay Room                 Backhand practice · Jul 6       ···      │
│ Main focus: Recovery balance                  3 similar mistakes      │
├───────────────┬──────────────────────────────────────┬───────────────┤
│ SHOTS         │                                      │ WHAT TO FIX   │
│               │        REAL CLIP / FRAME             │               │
│  03 Backhand  │                                      │ Recovery      │
│  04 Backhand  │        optional pose overlay         │ balance       │
│  08 Backhand  │                                      │               │
│  11 Backhand  │                                      │ Why it matters│
│               ├──────────────────────────────────────┤               │
│               │ Shot 8 · Backhand                    │ Compare best  │
│               │ Off balance on recovery              │ Next focus    │
│               │ Weight remains outside base...       │ Drill         │
├───────────────┴──────────────────────────────────────┴───────────────┤
│ Similar shots:  [03 clip] [08 clip] [11 clip]     Compare to best → │
└──────────────────────────────────────────────────────────────────────┘
```

### Primary sections

**Left rail**
- shot/rally list;
- visual thumbnails where media exists;
- simple outcome label;
- filter chip such as All / Backhands / Issues / Best.

**Center hero**
- real clip or frame;
- simple transport controls;
- optional overlays;
- selected-shot summary directly below.

**Right coaching rail**
- primary issue;
- supporting issue(s);
- compare-to-best action/result;
- next-session focus;
- drill suggestion.

**Bottom strip**
- similar shots / comparison examples;
- can expand into a detailed compare view.

---

## 8. Alternative layout variants

The recommended layout should be implemented first, but the design system should not prevent these variations.

### Variant A — Three-column analysis workspace

Closest to the current application.

- left: shots;
- center: video + selected-shot summary;
- right: coaching + metrics;
- developer surface removed from the primary layout.

**Pros:** smallest implementation change; good desktop density.  
**Cons:** can still feel analytical if the right rail gets overloaded.

**Best use:** first redesign iteration.

### Variant B — Video-first stacked experience

```text
Header
Large video
Primary coaching insight
Similar shots
Compare to best
Next-session plan
Advanced analysis (collapsed)
```

**Pros:** very approachable; excellent for tablets and laptop screens; strongest consumer-product feel.  
**Cons:** less simultaneous information; more vertical navigation.

**Best use:** likely long-term default if user testing favors simplicity.

### Variant C — Coaching-card dashboard

A session summary view first, with cards for:

- Main issue
- Best improvement
- Similar mistakes
- Strongest shots
- Recommended drill
- Review session

Selecting a card enters the detailed replay workspace.

**Pros:** friendly first screen, especially after a session.  
**Cons:** adds another navigation layer and requires session-level summarization.

**Best use:** future home/session-summary page rather than immediate hackathon iteration.

### Responsive/mobile variant

For narrow layouts:

1. video;
2. coaching takeaway;
3. horizontal shot carousel;
4. next-session focus;
5. expandable metrics and court map.

A permanent three-column layout should not be required on mobile.

---

## 9. Hero media options

### Option 1 — Real video clip — recommended

The selected shot's clip is the main visual.

Overlay possibilities:

- contact marker;
- pose skeleton toggle;
- center-of-mass / balance marker;
- recovery direction;
- simple before/after keyframe markers;
- one coaching callout at a time.

**Rule:** overlays should explain the coaching claim, not decorate the video.

### Option 2 — Freeze frame / keyframe hero

Use when clips are unavailable or expensive to load.

The frame can show:

- contact moment;
- body alignment;
- foot/base position;
- one highlighted region;
- short text annotation.

This is still preferable to making a synthetic court the primary visual because it shows evidence from the player's own session.

### Option 3 — Split comparison hero

When the user asks to compare against a better shot:

```text
Problem shot                       Reference shot
[video/frame]                      [video/frame]
Recovery 43                        Recovery 89
Late outside step                  Centered first recovery step
```

Possible playback modes:

- side-by-side synchronized playback;
- matched contact frames;
- scrub both at once;
- ghost overlay later if spatial alignment becomes reliable.

**Best use:** dedicated "Compare to your best" state rather than permanent default.

---

## 10. Tennis court visualization options

The court view should only occupy major visual space if it communicates data that the real footage cannot communicate as clearly.

### Option A — Contextual court mini-map — recommended short-term

Shrink the court to a secondary panel or inset.

Show only truthful spatial information such as:

- player location for selected shot;
- locations of similar shots;
- shot clusters;
- contact position if available;
- recovery direction/path if captured;
- target or landing zones if actually present in session data.

Visual style:

- clean, simple court;
- no glowing sci-fi player marker;
- muted base color;
- one accent color for current shot;
- second accent for comparison set;
- optional heatmap when enough samples exist.

**Advantages:** low realism burden, high information density, easy to understand.  
**Risks:** limited value if `court.x/y` is approximate or synthetic.

### Option B — Broadcast-style perspective court

Use a slightly elevated/perspective half-court graphic inspired by sports broadcasts rather than a flat engineering diagram.

Possible content:

- player silhouette;
- contact point;
- shot trajectory;
- recovery path;
- target area;
- comparison ghost/path.

Design language:

- broadcast graphics rather than neon HUD;
- realistic court proportions;
- subtle surface texture;
- clear baseline/service lines;
- restrained animation;
- no fake camera telemetry.

**Advantages:** visually compelling and familiar.  
**Risks:** can imply greater spatial precision than the data supports; more design/implementation work.

**Use only when:** underlying positional and trajectory data is credible enough to justify it.

### Option C — Real frame as spatial canvas — recommended long-term

Remove the standalone court from the hero entirely.

Use the actual camera frame with overlays for:

- player pose;
- contact point;
- movement/recovery vector;
- court-line interpretation;
- body-axis annotations;
- center-of-mass / base-of-support visualization;
- footwork path.

A small mini-map can remain nearby for spatial context.

**Advantages:** highest user trust, directly ties analysis to evidence, best consumer-product feel.  
**Risks:** depends on reliable camera/pose/court calibration.

### Option D — Hybrid media + mini-map — recommended product end state

```text
┌───────────────────────────────────────┐
│ REAL VIDEO                            │
│ pose/contact/recovery annotation      │
│                              ┌─────┐  │
│                              │court│  │
│                              │map  │  │
│                              └─────┘  │
└───────────────────────────────────────┘
```

The real media proves the coaching claim; the mini-map provides spatial context.

This is the strongest long-term direction.

---

## 11. Court visualization decision rules

Use these rules rather than choosing purely on aesthetics.

| Available data | Preferred visualization |
| --- | --- |
| Clip/frame only | Real media hero; no court required |
| Approximate player X/Y only | Small court mini-map |
| Reliable player/contact positions | Mini-map with contact/recovery cues |
| Reliable trajectory + calibrated court | Broadcast-style court becomes viable |
| Reliable pose + calibrated camera | Real-frame overlays + mini-map |
| Full spatial reconstruction | Hybrid or advanced analysis court view |

**Do not render a confident trajectory if only a generic line or inferred path exists.**

---

## 12. Coaching language and terminology

Player mode should translate system-centric labels into tennis/coaching language.

| Current / technical | Player-facing replacement |
| --- | --- |
| `SESSION` | Practice session |
| `CURRENT REVIEW` | Selected shot / Review this shot |
| `TECHNIQUE SIGNAL` | What happened / Technique |
| `WORKSPACE ACTIVITY` | Coach update / What changed |
| `PERSISTENT OUTCOME` | Next session |
| `AGENT SURFACE` | Hidden in Player mode |
| capability count | Hidden in Player mode |
| effect tag | Hidden in Player mode |
| session ID | Hidden or under Details |
| Load JSON | Import session under menu/settings |
| balance | Balance through contact |
| spacing | Distance from the ball |
| recovery | Recovery after contact |
| rotation | Shoulder & hip rotation |
| off-balance | Off balance on recovery / Lost balance |
| mishit | Poor contact / Mishit |
| late | Late contact |

Raw metric keys should remain unchanged in the domain model and capability schemas where appropriate. The UI should map them to friendly labels.

---

## 13. Selected-shot coaching card

The selected shot should explain itself before presenting numbers.

### Recommended structure

```text
SHOT 8 · BACKHAND

Main issue
Off balance on recovery

Why
Your weight remains outside your base after contact, delaying the first recovery step.

Most affected
Recovery after contact

Also affected
Balance through contact
```

### Variations

**Compact**
- one sentence + issue badge.

**Standard — recommended**
- main issue;
- why;
- 1–2 supporting signals.

**Coach detail**
- full metric values;
- confidence;
- frame/contact timing;
- source data.

---

## 14. Metrics presentation options

The current four equal bars should remain available but should not be the first thing a casual player must interpret.

### Option A — Primary + supporting metrics — recommended

```text
Main issue
Recovery after contact        40 / 100

Supporting
Balance through contact       43 / 100
Spacing                       57 / 100

View all metrics →
```

### Option B — Friendly score cards

Use descriptive bands:

- Strong
- Good
- Needs attention
- Major issue

Show numeric values only on expansion.

**Pros:** approachable.  
**Cons:** requires defensible thresholds.

### Option C — Full bars in Analysis mode

Keep the four bars essentially as they exist, but move them under "Detailed analysis" or Analysis mode.

### Option D — Comparison delta view

When comparing shots, numbers matter more:

```text
Recovery     Problem 43   Best 89   +46
Balance      Problem 47   Best 87   +40
Spacing      Problem 59   Best 83   +24
Rotation     Problem 72   Best 80    +8
```

Highlight the largest meaningful deltas.

---

## 15. Similar-shots experience

`find_similar_shots` is one of the strongest product behaviors and should have a first-class visual presentation.

### Recommended presentation

A horizontal media strip under the hero:

```text
Similar mistakes
[ Shot 3 ] [ Shot 8 ] [ Shot 11 ]
  0:48       2:21        3:29
```

Each card should show:

- thumbnail/keyframe;
- shot type;
- time;
- one issue label;
- optional similarity indicator in Analysis mode.

### Variations

**Simple:** thumbnails + labels only.  
**Comparison-ready:** multi-select checkboxes.  
**Coach mode:** similarity distance and metrics.  
**Agent-generated set:** subtle "Coach found 3 similar shots" explanation, not capability/tool terminology.

The player must be able to remove a false positive before asking the agent to compare the remaining set.

---

## 16. Compare-to-best module

This should become a signature feature.

### Entry points

- button: **Compare to my best backhands**;
- agent action after similar mistakes are selected;
- coaching card suggestion;
- context menu on a shot.

### Display variations

#### A. Side-by-side video — preferred

Problem vs strong reference.

#### B. Matched freeze frames

Useful when media bandwidth or synchronization is limited.

#### C. Metrics-first compare

Available in Analysis mode.

#### D. Annotated explanation

```text
Biggest difference: recovery

Problem shots
Your weight remains outside the base after contact.

Best shots
The first recovery step begins while the finish is still completing.
```

### Agent interaction

The agent can choose/reference shot sets via structured capabilities, but the visible product wording should remain coaching-oriented.

---

## 17. Next-session focus

The persistent coaching plan is one of the best existing concepts and should be more prominent in Player mode.

### Recommended card

```text
NEXT PRACTICE

Focus
Recovery balance

Cue
Start the first recovery step before the finish fully settles.

Suggested drill
Cross-court backhand + recover to center
```

### Variations

- one focus only — recommended initially;
- primary + secondary focus;
- focus + drill;
- focus + target number of reps;
- focus + Reachy/Tennisbot coaching behavior for the next live session.

The initial product should resist accumulating five simultaneous goals. One clear focus is more coach-like.

---

## 18. Drill recommendations

A drill card makes the system feel more actionable even before sophisticated drill generation exists.

Initial implementation can be deterministic mappings from focus areas:

- recovery → backhand + recover-to-center reps;
- spacing → feed variation / spacing cone drill;
- balance → controlled finish and split-step recovery;
- rotation → shadow swing / medicine-ball style rotation cue where appropriate.

Future implementation can use a coaching model or Seer/Tennisbot intelligence layer.

Player mode should distinguish between:

- **Observed:** grounded in session data;
- **Recommended:** coaching suggestion derived from that observation.

---

## 19. Visual design directions

Three visual directions are viable.

### Direction A — Premium sports coaching — recommended

Characteristics:

- off-white / light neutral base or softly tinted dark-on-light surfaces;
- restrained tennis green or blue accent;
- real photography/video dominates;
- soft panel boundaries;
- generous spacing;
- familiar consumer typography;
- minimal glow/neon;
- emphasis color used for one coaching insight at a time.

Keywords: premium, calm, athletic, trustworthy, personal.

### Direction B — Broadcast performance analytics

Characteristics:

- darker base;
- sports-broadcast typography;
- data overlays;
- clean court visualizations;
- stronger contrast;
- charts and comparison numbers more prominent.

Keywords: performance, competition, match analysis, coach booth.

This is appropriate for Analysis mode, but potentially too technical as the default.

### Direction C — Minimal wellness/performance app

Characteristics:

- bright background;
- large cards;
- strong summary language;
- fewer simultaneous charts;
- friendly status bands;
- mobile-first layout.

Keywords: approachable, routine, improvement, habit.

This may be best for a future broad consumer audience but could undersell Replay Room's deeper analysis.

### Recommended combination

Use **Premium sports coaching** for Player mode and selectively borrow **Broadcast analytics** patterns for Analysis mode.

---

## 20. Color and effects

The current acid-green-on-dark design is distinctive but contributes to the developer/AI-lab feel.

### Recommended changes

- remove most glow effects;
- use glow only for temporary selection/agent action feedback if at all;
- use warmer neutral backgrounds or a lighter theme;
- retain a tennis-derived accent color, but reduce saturation;
- use red/orange sparingly for clear issues, not as general decoration;
- use green for strong/reference technique only where semantics are clear;
- avoid making every card outlined like a debugger panel.

### Theme variation

A dark Analysis mode can coexist with a lighter Player mode if desired, but a single theme with different information density is simpler initially.

---

## 21. Agent interaction design

The most compelling WebMCP behavior is not "there is a chat box." It is that the agent understands and changes the same workspace the player is using.

### Ideal visible loop

1. Human selects a bad shot.
2. Agent reads current shot context.
3. Agent finds similar mistakes.
4. Replay Room visually shows those shots.
5. Human removes one false positive.
6. Agent compares the remaining shots with strong references.
7. Replay Room highlights the important difference.
8. Human asks to make it the next-session focus.
9. Coaching plan updates.

### UI rule

Whenever an agent changes application state, the app should visibly explain the result in player language:

- "Coach found 3 similar backhands."
- "Showing your 3 strongest backhands for comparison."
- "Recovery is the biggest difference."
- "Recovery balance saved as your next-practice focus."

Avoid:

- "Tool executed successfully";
- "show_shot_set called";
- "reversible-write completed".

Those belong only in Developer mode.

---

## 22. WebMCP / developer surface

Move the existing `Capabilities` panel into Developer mode rather than deleting it.

### Suggested developer drawer

```text
Developer

WebMCP     Ready
Surface    document.modelContext
Tools      6 / 6 registered
Session    tennisbot-20260706
Source     Blob / link

Capabilities
✓ get_current_shot           read
✓ find_similar_shots         read
✓ compare_shot_sets          read
✓ show_shot_set              reversible-write
✓ highlight_metrics          reversible-write
✓ set_next_session_focus     reversible-write

Recent activity
...
```

This is better for hackathon demos because the developer proof is still one click away while the default screenshot looks like a real product.

---

## 23. Session import and technical controls

Player mode should not lead with `Load JSON`.

### Recommended placement

Top-right overflow menu:

- Import session…
- Copy session link
- Session details
- Analysis mode
- Developer mode

Drag/drop JSON can remain supported invisibly.

For a normal user, future session acquisition should come from Tennisbot or a session library rather than local JSON.

---

## 24. Empty, loading, and degraded states

### Session loading

Show:

> Loading your practice session…

not Blob/API terminology.

### Linked session failure

Player-facing:

> We couldn't load that practice session. Showing the demo session instead.

Developer mode may show the raw error.

### No media available

Do not show a fake video player.

Use:

- selected-shot summary;
- clean freeze placeholder;
- court mini-map if spatial data exists;
- explicit "Video not captured for this shot".

### WebMCP unavailable

Player mode should continue normally and not show a warning unless the user tries an agent-specific action.

Developer mode can show WebMCP support state continuously.

---

## 25. Accessibility and non-technical usability

- Do not rely on green/red alone for strong/problem shots.
- Use descriptive labels beside scores.
- Player-facing text should avoid protocol/AI jargon.
- Minimum tap targets should support tablet use courtside.
- Video controls must be keyboard accessible.
- Metric explanations should be available via short help text.
- Avoid tiny monospace labels as primary content.
- Large numerical scores should always be accompanied by meaning.

---

## 26. Suggested component architecture

The design should encourage separation between data/capabilities and presentation.

Potential UI components:

```text
AppShell
├── PlayerHeader
├── SessionShotRail
├── ShotMediaViewer
│   ├── VideoPlayer / FreezeFrame
│   └── CoachingOverlay
├── ShotInsightCard
├── SimilarShotsStrip
├── CompareToBestPanel
├── NextSessionCard
├── DrillRecommendationCard
├── AnalysisDrawer
│   ├── MetricBreakdown
│   └── CourtMap
└── DeveloperDrawer
    ├── WebMcpStatus
    ├── CapabilityList
    └── AgentActivityTrace
```

The existing domain state and WebMCP capabilities should remain reusable across these components.

---

## 27. Implementation phases

### Phase 1 — Player-facing reframe

Highest impact, lowest architectural risk.

1. Add Player / Analysis / Developer presentation states.
2. Make Player mode default.
3. Hide WebMCP status, capability list, raw effect tags, session ID, and JSON control from Player mode.
4. Rename visible labels into coaching language.
5. Add friendly metric labels.
6. Convert the selected-shot area into a clear coaching summary.
7. Reduce the four equal metric bars to primary/supporting insights in Player mode.
8. Move the existing detailed bars to Analysis mode.
9. Convert the court into a smaller contextual panel.

### Phase 2 — Media-first coaching

1. Add clip/frame fields to the session model where needed.
2. Render real shot video or freeze frame as the hero.
3. Add the similar-shots media strip.
4. Add a dedicated compare-to-best state.
5. Add optional synchronized or matched-frame comparison.
6. Add a next-session focus + drill card.

### Phase 3 — Spatial visualization refinement

1. Choose mini-map vs broadcast court based on actual session data quality.
2. Add truthful contact/recovery locations.
3. Add clusters/heatmaps when enough shots are present.
4. Add real-frame pose/recovery overlays where calibration supports them.
5. Remove remaining decorative trajectory elements that are not data-backed.

### Phase 4 — Product polish

1. Responsive/tablet layout.
2. Session summary/home view.
3. Trend comparisons across sessions.
4. Tennisbot live handoff of the next-session plan.
5. Usability testing with non-technical tennis players.

---

## 28. Recommended immediate implementation choice

For the next version, use this combination:

- **Player mode as default**;
- **Analysis mode** for metrics and court detail;
- **Developer mode** for WebMCP proof;
- **real clip or captured frame as center hero** whenever available;
- **court view reduced to a mini-map**;
- **premium sports coaching visual language**;
- **one primary coaching insight** with supporting signals;
- **similar shots strip** below the hero;
- **Compare to your best** as a first-class action;
- **one persistent next-session focus** with an optional drill;
- preserve all existing Agent Forge/WebMCP capability semantics underneath.

This path gives the largest perception improvement without requiring a speculative new visualization pipeline.

---

## 29. Acceptance criteria

The redesign is successful when:

### Player comprehension

- A first-time user can identify the selected shot, main issue, and next recommended action without knowing what WebMCP is.
- The first screen contains no mandatory protocol or developer terminology.
- The user does not need to interpret four raw bars before receiving a coaching takeaway.

### Media trust

- When real media is available, the selected shot's media is visually dominant over synthetic diagrams.
- Spatial visualizations do not imply precision that the source session lacks.

### Agent collaboration

- Existing WebMCP flows continue to work.
- Agent-driven changes are visible and understandable in player language.
- Human corrections to an agent-selected shot set remain easy.

### Advanced capability

- Detailed metrics remain available.
- Court/spatial views remain available where useful.
- Developer mode still exposes WebMCP registration and capability information for debugging and demos.

### Product feel

- A screenshot of the default page reads as a tennis coaching product before it reads as an AI developer demo.

---

## 30. Evaluation / user-test prompts

Test the redesigned product with users who are not told anything about WebMCP.

Ask them:

1. "What do you think this app does?"
2. "What went wrong with the selected shot?"
3. "What would you work on next practice?"
4. "Can you find other shots with the same problem?"
5. "Can you compare this with one of your better backhands?"
6. "Where would you go for more detailed metrics?"

Success is not that they discover WebMCP. Success is that they understand the tennis workflow immediately.

For the hackathon/demo audience, separately test:

1. Can Developer mode prove which WebMCP tools are registered?
2. Can a browser agent visibly change the player-facing workspace?
3. Is the technical architecture demonstrable without contaminating the normal user experience?

---

## 31. Open decisions

These should be resolved through implementation/testing rather than abstract debate:

1. **Light vs dark default theme:** recommended to prototype a lighter premium sports variant before deciding.
2. **Three-column vs stacked default:** start by simplifying the existing three-column layout, then test stacked/video-first.
3. **Court mini-map vs removal:** keep mini-map only if the real Tennisbot capture provides meaningful court position.
4. **Metric thresholds:** do not introduce "Good/Needs attention" bands until thresholds are defensible.
5. **Drill generation:** start deterministic; model-generated drills can come later.
6. **Video comparison:** side-by-side is preferred, but matched freeze frames are a valid first implementation.
7. **Mode control:** `?debug=1` is sufficient initially; a polished settings/menu control can follow.

---

## 32. Design principle to preserve

Replay Room's technical differentiator remains important, but it should become invisible infrastructure for the player:

> **The user experiences coaching. The agent experiences structured capabilities. Both manipulate the same application state.**

That separation is the product advantage. The UI should not require the player to understand the mechanism in order to benefit from it.
