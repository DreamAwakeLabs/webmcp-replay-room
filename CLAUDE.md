# webmcp-replay-room — repo guide

Vue 3 + Vite + TypeScript WebMCP replay workspace (2026 WebMCP Challenge). Standalone: no
dependency on tennisbot/seer-agent source. `npm run check` = typecheck + vitest + build.
Node ≥ 20.19 (`npm run dev`).

## Where things are
- `src/domain/session.ts` — `TennisSession` schema + demo fixture + analysis functions.
- `src/domain/sessionLoader.ts` — runtime loading: `?session=<id|url>`, drag-drop JSON,
  `parseSession` is the ONLY validator external data passes through.
- `src/capabilities/replayCapabilities.ts` — the six WebMCP capabilities (read the session
  through a getter so a loaded session takes effect without re-registering).
- `src/composables/useWebMcpCapabilities.ts` — binds to `document.modelContext` (Chrome
  150+ spec surface; `navigator.*` is a Chrome-149 fallback) and shims Chrome 152's
  one-argument `execute(input)` for agent-forge (`adaptModelContext`).
- `api/sessions.ts` — Vercel function on Vercel Blob. MUST stay self-contained: Vercel does
  not bundle imports from `src/` into functions (runtime ERR_MODULE_NOT_FOUND). Structural
  checks only; the client validates.

## Deployment
- Vercel, GitHub-integrated (team `dreamawake`), production
  https://webmcp-replay-room-seven.vercel.app. Push to `main` = deploy.
- Env: connected Blob store (`BLOB_READ_WRITE_TOKEN`) + `REPLAY_PUSH_TOKEN`
  (`x-replay-token` header for POST /api/sessions).

## WebMCP facts (hard-won)
- Chrome ≥150: `document.modelContext`; `navigator.modelContextTesting` removed in 152.
- Claude in Chrome does NOT consume WebMCP. Use WebMCP Bridge extension + `webmcp-server`
  — the Web Store extension (0.1.0) is stale, build from `agentcathq/webmcp-react` source.
  Skills: `.claude/skills/webmcp-bridge-setup`, `.claude/skills/webmcp-server-install`.
- Exactly one bridge extension may be installed (server kicks the previous connection).

## Rules
- Never commit session data; sessions live in Blob or are loaded at runtime.
- Never push or add remotes without an explicit go-ahead.
- No AI attribution trailers in commits.
