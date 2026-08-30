# WebMCP Replay Room

**An agent-native tennis replay workspace where humans and browser agents collaboratively analyze shots, compare technique, and shape the next coaching session using WebMCP.**

Replay Room is a standalone Vue 3 application built for the 2026 WebMCP Challenge. It is inspired by a private embodied tennis-coaching project, but this repository does **not** depend on private Tennisbot or Seer Agent source code. The initial demo runs entirely from a deterministic, local session fixture.

## The interaction

The interesting loop is collaborative rather than autonomous:

1. A human selects a shot that feels wrong.
2. A browser agent calls `get_current_shot` and `find_similar_shots`.
3. The agent calls `show_shot_set` to change the workspace visibly.
4. The human can correct the set by selecting or resetting the view.
5. The agent compares problem shots with stronger references using `compare_shot_sets`.
6. `highlight_metrics` makes the important differences visible.
7. On explicit request, `set_next_session_focus` saves the discovered issue into the coaching plan.

## WebMCP capabilities

| Capability | Effect | Purpose |
| --- | --- | --- |
| `get_current_shot` | read | Read the human's current selection and metrics. |
| `find_similar_shots` | read | Find shots with similar technique signatures. |
| `compare_shot_sets` | read | Compare average technique metrics between two groups. |
| `show_shot_set` | reversible-write | Put a selected group into the visible review rail. |
| `highlight_metrics` | reversible-write | Highlight relevant metrics in the analysis UI. |
| `set_next_session_focus` | reversible-write | Update the visible, editable coaching plan. |

The capabilities are defined with [`@dreamawakelabs/agent-forge`](https://github.com/DreamAwakeLabs/agent-forge). Agent Forge owns the protocol-neutral capability contract and maps it to the current WebMCP Imperative API.

## Architecture

```text
Vue workspace state
       │
       ▼
Replay capabilities
       │
       ▼
   Agent Forge
       │
       ▼
document.modelContext
       │
       ▼
 browser agent
```

The domain functions do not click or scrape the UI. WebMCP calls the same semantic operations the application itself uses, and UI state updates are visible to the human.

## Run locally

Requires Node.js 20.19+.

```bash
npm install
npm run dev
```

Checks:

```bash
npm run check
```

WebMCP currently requires a WebMCP-enabled browser/origin-trial environment. In browsers without `document.modelContext`, Replay Room still runs as an ordinary interactive demo and reports that WebMCP is unavailable.

## Current fixture

The repository includes a synthetic twelve-shot session designed to make the first agent journey deterministic. The next media milestone is to replace the stylized court frame with sanitized shot clips exported from the private tennis analysis pipeline while retaining the same public session/capability contracts.

## Deployment

This is a static Vite application and can be deployed directly to Vercel. No server-side secrets are required for the challenge fixture.

## License

Apache-2.0
