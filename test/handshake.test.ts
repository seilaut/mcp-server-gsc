import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const serverArgs = ['--import', 'tsx', 'src/index.ts'];
const TIMEOUT_MS = 45_000;

// The tools src/server.ts registers today. Keep sorted.
const EXPECTED_TOOLS = [
  'detect_quick_wins',
  'enhanced_search_analytics',
  'get_sitemap',
  'index_inspect',
  'list_sitemaps',
  'list_sites',
  'search_analytics',
  'submit_sitemap',
];

test('handshake: server starts with a dummy credentials path and lists its 8 tools', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gsc-handshake-'));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: serverArgs,
    cwd: root,
    env: { GOOGLE_APPLICATION_CREDENTIALS: join(dir, 'does-not-exist.json') },
    stderr: 'ignore',
  });
  const client = new Client({ name: 'handshake-test', version: '0.0.0' });
  try {
    // connect() sends initialize and the initialized notification.
    await client.connect(transport, { timeout: TIMEOUT_MS });
    const { tools } = await client.listTools(undefined, { timeout: TIMEOUT_MS });
    assert.deepEqual(tools.map((t) => t.name).sort(), EXPECTED_TOOLS);
    for (const t of tools) {
      assert.equal(t.inputSchema.type, 'object', `${t.name} inputSchema.type`);
    }
  } finally {
    await client.close().catch(() => {}); // closes stdin, then kills the child if it lingers
    rmSync(dir, { recursive: true, force: true });
  }
});

test('refusal: without GOOGLE_APPLICATION_CREDENTIALS the server exits non-zero with its message', () => {
  const env = { ...process.env };
  delete env.GOOGLE_APPLICATION_CREDENTIALS;
  const r = spawnSync(process.execPath, serverArgs, {
    cwd: root,
    env,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    killSignal: 'SIGKILL',
    input: '',
  });
  assert.equal(r.error, undefined, String(r.error));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /GOOGLE_APPLICATION_CREDENTIALS environment variable is required/);
});
