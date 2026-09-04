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

## Loading a real session

The demo fixture is only the fallback. At startup the app checks `?session=<ref>`:

- `?session=<id>` fetches `/api/sessions?id=<id>` (the Blob-backed session store).
- `?session=<url>` fetches any absolute or same-origin JSON URL.
- Dropping a session JSON file anywhere on the page (or the Load JSON button) loads it locally with no network.

Every external session is validated against the `TennisSession` schema before it replaces the demo; on any failure the app shows a notice and stays on the demo fixture.

### Session store (`/api/sessions`)

`api/sessions.ts` is a Vercel serverless function backed by Vercel Blob:

- `POST` with a `TennisSession` body and an `x-replay-token` header stores it at `sessions/<id>.json` (overwritable, so re-pushing updates in place) and returns `{ id, shots, blobUrl, viewerPath }`.
- `GET ?id=<id>` returns the stored session JSON same-origin.

Deployment needs two things on the Vercel project:

1. A connected Blob store (provides `BLOB_READ_WRITE_TOKEN`).
2. A `REPLAY_PUSH_TOKEN` environment variable — without it, POST is disabled.

The private Tennisbot project pushes sessions here via `python -m tennisbot.replay_export <clips> --push https://<deployment>/api/sessions`.

## Browser requirements and driving it from Claude Code

WebMCP is exposed by Chrome 150+ on `document.modelContext` (the `navigator.modelContext` location was Chrome 149 only). Enable the WebMCP entries in `chrome://flags` and relaunch; the status pill then reads "WebMCP ready · document.modelContext" and the Capabilities panel shows 6/6. Chrome 152 invokes tools as `execute(input)` with a single argument; `src/composables/useWebMcpCapabilities.ts` normalizes that before agent-forge's wrapper (`adaptModelContext`), so the app works on agent-forge builds from before its own fix.

Claude in Chrome does not consume WebMCP. The working agent path is the **WebMCP Bridge** extension + `webmcp-server` (both from [agentcathq/webmcp-react](https://github.com/agentcathq/webmcp-react)), which surfaces the page's tools to Claude Code as `tab-<id>:<tool>`. The Chrome Web Store build of the extension (0.1.0) is stale on Chrome 150+ — build 0.2.0 from source. Two Claude Code skills in `.claude/skills/` automate the whole setup and are picked up automatically when this repo is opened in Claude Code:

- `webmcp-bridge-setup` — Chrome flags, build + load the extension, verify with a harness, troubleshooting table.
- `webmcp-server-install` — Node on PATH and `claude mcp add` so the tools are available in every session.

A verified run against the Tennisbot session: `get_current_shot` → `find_similar_shots` → `show_shot_set` → `compare_shot_sets` → `highlight_metrics` → `set_next_session_focus`, all executed from Claude Code with the workspace updating live.

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
