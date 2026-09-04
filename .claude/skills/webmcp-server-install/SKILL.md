---
name: webmcp-server-install
description: Make webmcp-server a permanent Claude Code MCP server on any machine — install Node.js on the user's PATH if missing, register the server with `claude mcp add`, and verify tools arrive as tab-<id>:<tool>. Use for "install webmcp-server", "register the WebMCP bridge with Claude Code", "make WebMCP tools available in every session", or when the bridge only works while a harness script is running.
---

# webmcp-server as a permanent Claude Code MCP server

`webmcp-server` (npm) is the stdio MCP server that the WebMCP Bridge Chrome extension
connects to over `ws://127.0.0.1:12315`. Registering it with Claude Code means every
session gets the page's WebMCP tools as `tab-<tabId>:<toolName>` with nothing else
running. The browser side (Chrome flags, building + loading the extension) is the
`webmcp-bridge-setup` skill — do that first if the extension isn't installed yet.

## Step 1 — Node.js ≥ 20.19 on the user's PATH

Claude Code launches the server via `npx`, so Node must be on the PATH of the shell
that starts Claude Code, not just on yours.

```powershell
node --version; npm --version
```

If missing, install system-wide (state change — say so before running):

| OS | Command |
| --- | --- |
| Windows | `winget install OpenJS.NodeJS.LTS` (then open a NEW shell) |
| macOS | `brew install node` |
| Linux | distro package or `https://github.com/nodesource/distributions` |

Re-check in a fresh shell. A portable Node in a temp dir is fine for a one-off harness
but NOT for this step — Claude Code won't find it.

## Step 2 — Register the server (user scope, all projects)

```powershell
claude mcp add --transport stdio --scope user webmcp-server -- npx webmcp-server
claude mcp list
```

Alternative: add to `~/.claude.json` (or a project `.mcp.json`):

```json
{ "mcpServers": { "webmcp-server": { "command": "npx", "args": ["webmcp-server"] } } }
```

Custom port: add `"env": { "WEBMCP_BRIDGE_PORT": "9400" }` and set the same port in the
extension popup. Restart Claude Code — MCP servers load at session start.

## Step 3 — Verify

1. `claude mcp list` shows `webmcp-server` as connected.
2. With a WebMCP page open and the extension set to **Always on**, the extension dot is
   **green** and the tools appear in Claude Code's tool list as `tab-<id>:<name>`
   (search the exact tool name).
3. Call a read-only tool; it should return JSON, not an error.

## Gotchas

- Only ONE `webmcp-server` may run — a harness (`serve.mjs` from `webmcp-bridge-setup`)
  and the registered server fight over port 12315 (`EADDRINUSE`). Stop the harness.
- Exactly one bridge extension may be installed; two ping-pong forever.
- The Chrome Web Store extension (0.1.0) is stale on Chrome ≥150 — see
  `webmcp-bridge-setup` Step 3 to build 0.2.0+ from source.
- npm 10.9 can crash with `Cannot read properties of null (reading 'edgesOut')` on some
  dependency graphs; Node ≥22.15 ships a newer npm, or `corepack enable` and use pnpm.
