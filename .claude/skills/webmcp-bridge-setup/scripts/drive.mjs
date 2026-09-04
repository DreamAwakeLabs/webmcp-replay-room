// Minimal MCP client that spawns webmcp-server over stdio and either lists
// the bridged WebMCP tools or calls one.  Usage:
//   node drive.mjs list
//   node drive.mjs call <tool-name> '<json-args>'
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverBin = path.join(here, 'node_modules', 'webmcp-server', 'bin', 'webmcp-server.js');
const [mode = 'list', toolName, rawArgs = '{}'] = process.argv.slice(2);
const waitMs = Number(process.env.WAIT_MS ?? 4000);

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverBin],
  stderr: 'pipe',
});
transport.stderr?.on('data', (chunk) => process.stderr.write(`[server] ${chunk}`));

const client = new Client({ name: 'tennisbot-drive', version: '0.0.1' });
await client.connect(transport);
// give the bridge extension a moment to (re)connect over the websocket
await new Promise((resolve) => setTimeout(resolve, waitMs));

const { tools } = await client.listTools();
if (mode === 'list') {
  console.log(JSON.stringify(tools.map((t) => ({ name: t.name, description: t.description })), null, 2));
} else if (mode === 'call') {
  const result = await client.callTool({ name: toolName, arguments: JSON.parse(rawArgs) });
  console.log(JSON.stringify(result, null, 2));
} else {
  console.error(`unknown mode ${mode}`);
}
await client.close();
