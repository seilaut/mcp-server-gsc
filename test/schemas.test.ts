import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SearchAnalyticsSchema, EnhancedSearchAnalyticsSchema } from '../src/schemas.ts';

const base = { siteUrl: 'sc-domain:example.com', startDate: '2026-01-01', endDate: '2026-01-31' };
const ok = (extra: Record<string, unknown> = {}) => SearchAnalyticsSchema.safeParse({ ...base, ...extra });

test('dimensions: every allowed value is accepted and split on commas', () => {
  for (const d of ['query', 'page', 'country', 'device', 'date', 'searchAppearance']) {
    const r = ok({ dimensions: d });
    assert.equal(r.success, true, d);
    assert.deepEqual(r.data!.dimensions, [d]);
  }
  assert.deepEqual(ok({ dimensions: 'query, page ,date' }).data!.dimensions, ['query', 'page', 'date']);
});

test('dimensions: omitted is accepted; unknown, empty or wrong-case values are rejected', () => {
  assert.equal(ok().success, true);
  assert.equal(ok().data!.dimensions, undefined);
  for (const d of ['bogus', 'query,bogus', '', 'Query', 'query,,page']) {
    assert.equal(ok({ dimensions: d }).success, false, JSON.stringify(d));
  }
  assert.equal(ok({ dimensions: ['query'] }).success, false, 'array is not a string');
});

test('rowLimit: defaults to 1000', () => {
  assert.equal(ok().data!.rowLimit, 1000);
});

test('rowLimit: bounds are 1..25000 inclusive', () => {
  for (const n of [1, 2, 1000, 24999, 25000]) assert.equal(ok({ rowLimit: n }).success, true, String(n));
  for (const n of [0, -1, 25001, 100000]) assert.equal(ok({ rowLimit: n }).success, false, String(n));
  assert.equal(ok({ rowLimit: '10' }).success, false, 'string is rejected');
});

test('rowLimit: non-integers are currently accepted (audit F17, pinned not endorsed)', () => {
  assert.equal(ok({ rowLimit: 10.5 }).success, true);
});

test('type: accepts web, image, video, news, discover, googleNews, or omitted', () => {
  for (const t of ['web', 'image', 'video', 'news', 'discover', 'googleNews']) {
    assert.equal(ok({ type: t }).success, true, t);
  }
  assert.equal(ok().success, true);
});

test('type: rejects unknown or differently-cased values', () => {
  for (const t of ['', 'Web', 'googlenews', 'GOOGLE_NEWS', 'all', 'sitemap']) {
    assert.equal(ok({ type: t }).success, false, JSON.stringify(t));
  }
});

test('enhanced schema inherits the same dimensions, rowLimit and type rules', () => {
  const e = (extra: Record<string, unknown>) => EnhancedSearchAnalyticsSchema.safeParse({ ...base, ...extra });
  assert.equal(e({ dimensions: 'query', rowLimit: 25000, type: 'discover' }).success, true);
  assert.equal(e({ dimensions: 'nope' }).success, false);
  assert.equal(e({ rowLimit: 25001 }).success, false);
  assert.equal(e({ type: 'nope' }).success, false);
});
