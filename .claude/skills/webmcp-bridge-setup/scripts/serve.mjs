// Long-lived MCP client: keeps webmcp-server (and its websocket) alive so the
// bridge extension can connect, logs the tool list whenever it changes, and
// executes commands appended to cmd.jsonl (one {"name","args"} per line).
// Results go to out.log.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverBin = path.join(here, 'node_modules', 'webmcp-server', 'bin', 'webmcp-server.js');
const cmdFile = path.join(here, 'cmd.jsonl');
const outFile = path.join(here, 'out.log');
writeFileSync(cmdFile, '');
writeFileSync(outFile, '');
const log = (line) => appendFileSync(outFile, `${new Date().toISOString().slice(11, 19)} ${line}\n`);

const transport = new StdioClientTransport({ command: process.execPath, args: [serverBin], stderr: 'pipe' });
transport.stderr?.on('data', (chunk) => log(`[server] ${String(chunk).trim()}`));
const client = new Client({ name: 'tennisbot-drive', version: '0.0.1' });
await client.connect(transport);
log('client connected; waiting for bridge tools');

let lastNames = '';
let consumed = 0;
setInterval(async () => {
  try {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).join(', ');
    if (names !== lastNames) {
      lastNames = names;
      log(`TOOLS (${tools.length}): ${names || '<none>'}`);
    }
    const lines = existsSync(cmdFile) ? readFileSync(cmdFile, 'utf8').split('\n').filter(Boolean) : [];
    for (const line of lines.slice(consumed)) {
      consumed += 1;
      const { name, args = {} } = JSON.parse(line);
      log(`CALL ${name} ${JSON.stringify(args)}`);
      try {
        const result = await client.callTool({ name, arguments: args });
        log(`RESULT ${name}: ${JSON.stringify(result)}`);
      } catch (cause) {
        log(`ERROR ${name}: ${cause instanceof Error ? cause.message : cause}`);
      }
    }
  } catch (cause) {
    log(`poll error: ${cause instanceof Error ? cause.message : cause}`);
  }
}, 2000);
