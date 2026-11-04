import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectQuickWins, ctrToPercent } from '../src/quick-wins.ts';

const row = (o: Record<string, unknown> = {}) => ({
  keys: ['q', '/p'], clicks: 0, impressions: 100, ctr: 0.01, position: 5, ...o,
});

test('CTR: fraction becomes percentage', () => {
  assert.equal(ctrToPercent(0.02), 2);
  assert.equal(ctrToPercent(0.5), 50);
  const [r] = detectQuickWins([row({ ctr: 0.0123 })]);
  assert.equal(r.currentCtr, 1.23);
});

test('CTR: zero or missing gives 0, never NaN', () => {
  assert.equal(ctrToPercent(0), 0);
  assert.equal(ctrToPercent(undefined), 0);
  assert.equal(ctrToPercent(null), 0);
  const out = detectQuickWins([row({ impressions: 0, ctr: 0 }), row({ ctr: undefined })], { minImpressions: 0 });
  assert.equal(out.length, 2);
  for (const r of out) assert.ok(Number.isFinite(r.currentCtr) && Number.isFinite(r.potentialClicks) && Number.isFinite(r.additionalClicks));
  assert.equal(out[0].currentCtr, 0);
  assert.ok(!JSON.stringify(out).includes('null'));
});

test('threshold minImpressions: below excluded, at and above included', () => {
  const n = (i: number) => detectQuickWins([row({ impressions: i })]).length;
  assert.equal(n(49), 0);
  assert.equal(n(50), 1);
  assert.equal(n(51), 1);
});

test('threshold maxCtr (percent): at and below included, above excluded', () => {
  const n = (c: number) => detectQuickWins([row({ ctr: c })]).length;
  assert.equal(n(0.0199), 1);
  assert.equal(n(0.02), 1);
  assert.equal(n(0.0201), 0);
});

test('threshold position range: 4 and 10 inclusive', () => {
  const n = (p: number) => detectQuickWins([row({ position: p })]).length;
  assert.equal(n(3.9), 0);
  assert.equal(n(4), 1);
  assert.equal(n(4.1), 1);
  assert.equal(n(9.9), 1);
  assert.equal(n(10), 1);
  assert.equal(n(10.1), 0);
});

test('custom thresholds override defaults', () => {
  const t = { minImpressions: 10, maxCtr: 5, positionRangeMin: 1, positionRangeMax: 20 };
  assert.equal(detectQuickWins([row({ impressions: 10, ctr: 0.05, position: 20 })], t).length, 1);
  assert.equal(detectQuickWins([row({ impressions: 9 })], t).length, 0);
});

test('potential clicks use 5% target; additionalClicks floors at 0; opportunity label', () => {
  const [hi] = detectQuickWins([row({ impressions: 1000, clicks: 10 })]);
  assert.equal(hi.potentialClicks, 50);
  assert.equal(hi.additionalClicks, 40);
  assert.equal(hi.opportunity, 'High');
  const [lo] = detectQuickWins([row({ impressions: 100, clicks: 50, ctr: 0.0 })]);
  assert.equal(lo.additionalClicks, 0);
  assert.equal(lo.opportunity, 'Low');
});

test('sort: descending by additionalClicks', () => {
  const out = detectQuickWins([
    row({ keys: ['a'], impressions: 100 }),
    row({ keys: ['b'], impressions: 1000 }),
    row({ keys: ['c'], impressions: 500 }),
  ]);
  assert.deepEqual(out.map(r => r.query), ['b', 'c', 'a']);
});

test('sort: ties keep input order (stable)', () => {
  const out = detectQuickWins([
    row({ keys: ['x'], impressions: 200 }),
    row({ keys: ['y'], impressions: 200 }),
    row({ keys: ['z'], impressions: 200 }),
  ]);
  assert.deepEqual(out.map(r => r.query), ['x', 'y', 'z']);
});

test('output shape and defaults for missing keys', () => {
  const [r] = detectQuickWins([{ impressions: 100, ctr: 0.01, position: 5.26 }]);
  assert.deepEqual(Object.keys(r), ['query', 'page', 'currentPosition', 'impressions', 'currentClicks', 'currentCtr', 'potentialClicks', 'additionalClicks', 'opportunity', 'optimizationNote']);
  assert.equal(r.query, 'N/A');
  assert.equal(r.page, 'N/A');
  assert.equal(r.currentPosition, 5.3);
  assert.equal(r.optimizationNote, 'Move from position 5.3 to improve CTR');
});
