---
name: webmcp-bridge-setup
description: Set up the WebMCP Bridge on a new machine so Claude Code can discover and call a web page's WebMCP tools (document.modelContext) — Node check, Chrome flags, build + load the bridge extension from source, register webmcp-server as an MCP server, verify with a harness. Use for "connect WebMCP tools to Claude Code", "set up webmcp-server", "load the WebMCP Bridge extension", or when a page shows "WebMCP ready" but no agent can see its tools.
---

# WebMCP Bridge setup

Goal: a page's tools registered on Chrome's native `document.modelContext` become
callable from Claude Code as MCP tools named `tab-<tabId>:<toolName>`.

Chain: page → Chrome `document.modelContext` → **WebMCP Bridge** extension (reads
`getTools()`/`executeTool()`, connects over WebSocket) → **webmcp-server**
(`ws://127.0.0.1:12315`, speaks MCP over stdio) → Claude Code.

Both halves come from one upstream repo: `agentcathq/webmcp-react` (extension in
`extension/`, server published on npm as `webmcp-server`). No fork is needed — nothing
is patched. Last known-good build: commit `82e6fef0d93c83b1d0d74599bf57389063ce3ba6`
(2026-09-03, "bump webmcp-server and extension to 0.2.0"), verified end to end on
Chrome 152.0.7977.65 with `webmcp-server@0.2.0`. Try `main` first; pin that SHA if
`main` misbehaves.

## Facts that cost hours — read before doing anything

- **Chrome ≥150 puts the API on `document.modelContext`.** `navigator.modelContext`
  was Chrome 149 only and is gone from 153; `navigator.modelContextTesting` was
  removed in 152. Anything reading those sees nothing.
- **The Chrome Web Store "WebMCP Bridge" (0.1.0, April 2026) is stale** — it reads
  `navigator.modelContextTesting`, so on current Chrome it connects (green dot) but
  reports zero tools. You must build 0.2.0+ from source and load it unpacked.
- **Exactly one bridge extension may be installed.** `webmcp-server` keeps one
  connection and closes the previous one on every new connect; two copies
  ping-pong forever (log shows `Extension connected` / `disconnected` every second).
  Remove the Web Store copy after loading the unpacked one.
- **Chrome 152 calls a page tool as `execute(input)` — one argument.** A page wrapper
  that destructures `(input, { signal })` throws, and Chrome reports only the generic
  `"Tool was executed but the invocation failed"`. Pages built on
  `@dreamawakelabs/agent-forge` need the fix (`options?.signal`) or the page-side
  shim (`adaptModelContext` in webmcp-replay-room). Diagnose with the console probe
  below.
- **Claude in Chrome does not consume WebMCP** (anthropics/claude-code#30645 closed).
  This bridge is the path, not that extension.
- Only one process may own port 12315 (a registered MCP server AND the harness
  cannot run at once).

## Step 1 — Node.js ≥ 20.19

```powershell
node --version; npm --version
```
If missing: Windows `winget install OpenJS.NodeJS.LTS`; macOS `brew install node`.
If you cannot install system-wide, a portable copy works for the session: download
`https://nodejs.org/dist/v22.14.0/node-v22.14.0-win-x64.zip`, extract to a scratch
dir, and prepend that dir to `PATH` in every shell command. `claude mcp add` with
`npx` needs Node on the *user's* PATH, not just yours.

## Step 2 — Chrome flags (user does this)

`chrome://flags` → search **WebMCP** → enable every entry (e.g. `#enable-webmcp`,
`#enable-webmcp-testing`) → Relaunch. Verify on the target page in DevTools
(type `allow pasting` first if prompted):

```js
const d = Object.getOwnPropertyDescriptor(Document.prototype, 'modelContext');
console.log(d?.get?.toString().slice(0, 60));          // expect "[native code]"
document.modelContext.getTools().then(t => console.log(t.map(x => x.name)));
```
`[native code]` + the tool names = the page side is fine. A polyfill (own property,
no `[native code]`) is invisible to the bridge — disable whatever injects it.

## Step 3 — Build the bridge extension from source

```powershell
git clone https://github.com/agentcathq/webmcp-react.git
cd webmcp-react
git checkout 82e6fef0d93c83b1d0d74599bf57389063ce3ba6   # known-good; or stay on main
cd extension
npm install
npm run build          # dist/ = complete unpacked extension (manifest, icons, popup, scripts)
```
Copy `extension/dist` to a durable path the user will keep, e.g.
`C:\Source\webmcp-bridge-extension` or `~/webmcp-bridge-extension` (never a temp dir —
Chrome loads it from that path on every start). Confirm
`manifest.json` says `"version": "0.2.0"` or newer.

## Step 4 — Load it (user does this)

1. `chrome://extensions` → **Developer mode** toggle (top-right of that page; if
   absent, an enterprise policy hides it — check `chrome://policy` for
   `ExtensionDeveloperModeSettings`, use an unmanaged profile).
2. **Load unpacked** → select the copied `dist` folder.
3. **Remove** the Web Store "WebMCP Bridge" card (the one not marked "Unpacked").
4. On the target tab: extension icon → **Always on** (per origin, survives reloads).
   Reload the tab.

## Step 5 — Register the server with Claude Code (permanent path)

Use the `webmcp-server-install` skill (Node on the user's PATH, then
`claude mcp add --transport stdio --scope user webmcp-server -- npx webmcp-server`,
restart Claude Code). Tools appear as `tab-<tabId>:<toolName>`; the extension dot turns
**green** once the server is up.

## Step 5b — Drive it from the current session (harness, no restart)

Use the bundled scripts in this skill's `scripts/` folder when you need tools now:

```powershell
mkdir webmcp-client; cd webmcp-client
npm init -y; npm install webmcp-server @modelcontextprotocol/sdk
copy <skill-dir>\scripts\*.mjs .
node drive.mjs list                                  # one-shot: spawn server, list tools
node serve.mjs                                       # long-lived (run in background)
```
`serve.mjs` keeps the server alive, appends the tool list to `out.log` whenever it
changes, and executes each line appended to `cmd.jsonl`
(`{"name":"tab-123:get_current_shot","args":{}}`), writing `RESULT`/`ERROR` lines to
`out.log`. Wait for tools with a bounded loop, e.g.
`until grep -qE "TOOLS \([1-9]" out.log; do sleep 2; done`.

## Verification checklist

1. `out.log` (or Claude Code's tool list) shows `TOOLS (N): tab-…` with the page's tools.
2. A read-only tool returns JSON, not `isError`.
3. A write tool visibly changes the page (this is the demo moment).

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Dot yellow, server log silent | extension not connected | server not running / wrong port; start server, wait for reconnect |
| `Extension connected` / `disconnected` every 1 s | two bridge extensions installed | remove the Web Store copy |
| Dot green, "waiting for tools", page badge says ready | Web Store 0.1.0 build (reads removed `navigator.modelContextTesting`) | build 0.2.0+ from source (Step 3) |
| Same, and console probe shows no `[native code]` | page registered into a polyfill | disable the polyfill extension; enable Chrome flags |
| `Tool was executed but the invocation failed` | page handler threw — usually `execute(input)` one-arg vs `(input, { signal })` | fix/shim the page wrapper; probe with a tool that logs `arguments.length` |
| `EADDRINUSE 12315` | another webmcp-server (registered MCP or harness) | stop it; only one may run |
