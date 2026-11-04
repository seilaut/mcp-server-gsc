import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TIMEOUT_MS = 45_000;

test('capabilities: server advertises tools only (no resources, no prompts)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gsc-caps-'));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', 'tsx', 'src/index.ts'],
    cwd: root,
    env: { GOOGLE_APPLICATION_CREDENTIALS: join(dir, 'does-not-exist.json') },
    stderr: 'ignore',
  });
  const client = new Client({ name: 'capabilities-test', version: '0.0.0' });
  try {
    await client.connect(transport, { timeout: TIMEOUT_MS });
    const caps = client.getServerCapabilities();
    assert.ok(caps, 'server capabilities present');
    assert.ok(caps.tools, 'tools capability present');
    assert.equal(caps.resources, undefined, 'resources capability absent');
    assert.equal(caps.prompts, undefined, 'prompts capability absent');
  } finally {
    await client.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
});
