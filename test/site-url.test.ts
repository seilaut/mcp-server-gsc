import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fallbackSiteUrls, truncateForError } from '../src/site-url.ts';

test('sc-domain: input has no fallback candidates and is never rewritten', () => {
  assert.deepEqual(fallbackSiteUrls('sc-domain:example.com'), []);
  assert.deepEqual(fallbackSiteUrls('sc-domain:www.example.com'), []);
});

test('https URL-prefix property falls back to the bare domain property', () => {
  assert.deepEqual(fallbackSiteUrls('https://www.example.com/'), ['sc-domain:example.com']);
});

test('http URL-prefix property falls back to the domain property (current behaviour)', () => {
  assert.deepEqual(fallbackSiteUrls('http://example.com'), ['sc-domain:example.com']);
});

test('a bare host throws a clear Error naming both accepted forms, not a TypeError', () => {
  assert.throws(
    () => fallbackSiteUrls('mysite.test'),
    (err: unknown) =>
      err instanceof Error &&
      !(err instanceof TypeError) &&
      err.message.includes('mysite.test') &&
      err.message.includes('sc-domain:') &&
      err.message.includes('https://'),
  );
});

test('an empty string throws a clear Error', () => {
  assert.throws(
    () => fallbackSiteUrls(''),
    (err: unknown) =>
      err instanceof Error && !(err instanceof TypeError) && err.message.includes('sc-domain:'),
  );
});

test('a missing site URL throws a clear Error', () => {
  assert.throws(
    () => fallbackSiteUrls(undefined),
    (err: unknown) => err instanceof Error && !(err instanceof TypeError),
  );
});

test('truncateForError: a 1,000,000-character input with an emoji at the cut stays well formed and capped', () => {
  const emoji = '\u{1F600}';
  // 99 ASCII characters, then an emoji straddling code unit 100, then a very long tail.
  const input = 'a'.repeat(99) + emoji + 'b'.repeat(1_000_000);
  const out = truncateForError(input);
  assert.equal(out, `${'a'.repeat(99)}${emoji}... (${99 + 1 + 1_000_000} characters)`);
  assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(out), 'no lone surrogate');
  assert.ok(out.length < 150);
});
