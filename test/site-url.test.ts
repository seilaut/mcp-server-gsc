import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fallbackSiteUrls } from '../src/site-url.ts';

test('sc-domain: input has no fallback candidates and is never rewritten', () => {
  assert.deepEqual(fallbackSiteUrls('sc-domain:example.com'), []);
  assert.deepEqual(fallbackSiteUrls('sc-domain:www.example.com'), []);
});

test('https URL-prefix property falls back to the domain property (current behaviour, hostname kept as-is)', () => {
  assert.deepEqual(fallbackSiteUrls('https://www.example.com/'), ['sc-domain:www.example.com']);
});

test('http URL-prefix property falls back to the domain property (current behaviour)', () => {
  assert.deepEqual(fallbackSiteUrls('http://example.com'), ['sc-domain:example.com']);
});

test('a bare host throws a clear Error naming both accepted forms, not a TypeError', () => {
  assert.throws(
    () => fallbackSiteUrls('example.com'),
    (err: unknown) =>
      err instanceof Error &&
      !(err instanceof TypeError) &&
      err.message.includes('example.com') &&
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
