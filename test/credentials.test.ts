import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveCredentialConfig } from '../src/credentials.ts';
import { SearchConsoleService } from '../src/search-console.ts';

// Obviously fake values. No real key shape (no PEM header).
const fake = {
  type: 'service_account',
  client_email: 'test@example.invalid',
  private_key: 'FAKE',
  project_id: 'fake-project',
};

test('inline JSON is parsed into a credentials config', () => {
  assert.deepEqual(resolveCredentialConfig(JSON.stringify(fake)), { credentials: fake });
});

test('inline JSON with leading whitespace is still treated as JSON', () => {
  assert.deepEqual(resolveCredentialConfig('  \n' + JSON.stringify(fake)), { credentials: fake });
});

test('a key-file path is passed through as keyFile, and the real file is readable by the service', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gsc-cred-'));
  try {
    const file = join(dir, 'key.json');
    writeFileSync(file, JSON.stringify(fake));
    assert.deepEqual(resolveCredentialConfig(file), { keyFile: file });
    assert.doesNotThrow(() => new SearchConsoleService(file));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('invalid JSON throws exactly "Invalid credentials: failed to parse JSON"', () => {
  assert.throws(() => resolveCredentialConfig('{not json'), {
    message: 'Invalid credentials: failed to parse JSON',
  });
  assert.throws(() => new SearchConsoleService('{not json'), {
    message: 'Invalid credentials: failed to parse JSON',
  });
});

test('the parse error never echoes the credential text', () => {
  const secretish = '{"private_key": "SECRET-MARKER-123", oops';
  try {
    resolveCredentialConfig(secretish);
    assert.fail('should have thrown');
  } catch (e) {
    assert.ok(!String((e as Error).message).includes('SECRET-MARKER-123'));
  }
});

test('a path that does not exist: pinned current behaviour is no error at load time', () => {
  const missing = join(tmpdir(), 'gsc-cred-does-not-exist', 'nope.json');
  assert.deepEqual(resolveCredentialConfig(missing), { keyFile: missing });
  assert.doesNotThrow(() => new SearchConsoleService(missing));
});

test('a missing key file only fails later, when the client is first requested', async () => {
  const missing = join(tmpdir(), 'gsc-cred-does-not-exist', 'nope.json');
  const svc = new SearchConsoleService(missing) as unknown as { auth: { getClient(): Promise<unknown> } };
  await assert.rejects(() => svc.auth.getClient());
});
