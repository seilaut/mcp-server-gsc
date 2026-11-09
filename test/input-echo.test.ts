import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { fallbackSiteUrls } from '../src/site-url.ts';
import { createServer } from '../src/server.ts';
import { SearchConsoleService } from '../src/search-console.ts';

// Errors may echo a little of the input to help the caller, never all of a long one.
const LONG = 'y'.repeat(10000);
const MAX_ERROR_LENGTH = 500;

test('site-url: a 10,000-character value that is not a URL does not come back whole', () => {
  assert.throws(
    () => fallbackSiteUrls(LONG),
    (err: unknown) =>
      err instanceof Error &&
      err.message.length < MAX_ERROR_LENGTH &&
      !err.message.includes('y'.repeat(200)) &&
      err.message.includes('sc-domain:'),
  );
});

test('site-url: a 10,000-character URL with a non-http scheme does not come back whole', () => {
  assert.throws(
    () => fallbackSiteUrls(`ftp://${LONG}`),
    (err: unknown) =>
      err instanceof Error &&
      err.message.length < MAX_ERROR_LENGTH &&
      !err.message.includes('y'.repeat(200)) &&
      err.message.includes('sc-domain:'),
  );
});

test('site-url: a short bad value is still echoed in full', () => {
  assert.throws(() => fallbackSiteUrls('mysite.test'), /Invalid siteUrl "mysite\.test"/);
});

test('zod enum error from the server does not echo a long invalid value', async () => {
  const original = (SearchConsoleService.prototype as any).getWebmasters;
  (SearchConsoleService.prototype as any).getWebmasters = async () => ({});
  const server = createServer('/nonexistent/key.json');
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'input-echo-test', version: '0.0.0' });
  await Promise.all([server.connect(a), client.connect(b)]);
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    let message = '';
    try {
      const res: any = await client.callTool({
        name: 'enhanced_search_analytics',
        arguments: {
          siteUrl: 'sc-domain:example.com',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          deviceFilter: LONG,
        },
      });
      message = res.isError ? String(res.content?.[0]?.text) : 'NO ERROR';
    } catch (e) {
      message = (e as Error).message;
    }
    assert.match(message, /Invalid arguments/);
    assert.match(message, /deviceFilter/);
    assert.ok(message.length < MAX_ERROR_LENGTH, `message length ${message.length}`);
    assert.ok(!message.includes('y'.repeat(200)));
  } finally {
    console.error = originalConsoleError;
    (SearchConsoleService.prototype as any).getWebmasters = original;
    await client.close();
    await server.close();
  }
});

test('truncation never leaves half of an emoji (lone surrogate) at the cut', () => {
  // 4-byte characters: a UTF-16 slice at an odd unit count would split one.
  for (const prefix of ['', 'a']) {
    const input = prefix + '\u{1F600}'.repeat(300);
    assert.throws(
      () => fallbackSiteUrls(input),
      (err: unknown) => err instanceof Error && !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(err.message) && err.message.length < MAX_ERROR_LENGTH,
      JSON.stringify(prefix),
    );
  }
});
