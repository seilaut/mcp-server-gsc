import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectQuickWins } from '../src/quick-wins.ts';

const row = (o: Record<string, unknown> = {}) => ({
  keys: ['q', '/p'], clicks: 0, impressions: 100, ctr: 0.01, position: 5, ...o,
});

test('potentialClicks rounds a non-integer: 110 impressions at 5% is 5.5, reported as 6', () => {
  const [r] = detectQuickWins([row({ impressions: 110 })]);
  assert.equal(r.potentialClicks, 6);
  assert.equal(r.additionalClicks, 6);
});

test('potentialClicks rounds down below .5: 109 impressions is 5.45, reported as 5', () => {
  const [r] = detectQuickWins([row({ impressions: 109 })]);
  assert.equal(r.potentialClicks, 5);
});

test('a row with no position is excluded by the default position range', () => {
  const rows = [row({ position: undefined }), row({ position: null }), row({ keys: ['kept'] })];
  const out = detectQuickWins(rows);
  assert.deepEqual(out.map(r => r.query), ['kept']);
});

test('positionRangeMin 0 still returns no row for an undefined or null position', () => {
  assert.deepEqual(detectQuickWins([row({ position: undefined })], { positionRangeMin: 0 }), []);
  assert.deepEqual(detectQuickWins([row({ position: null })], { positionRangeMin: 0 }), []);
  assert.deepEqual(detectQuickWins([row({ position: NaN })], { positionRangeMin: 0 }), []);
});

test('no output contains "position 0.0" when position-less rows sit beside a real one', () => {
  const rows = [row({ position: undefined }), row({ position: null }), row({ keys: ['kept'], position: 5 })];
  const out = detectQuickWins(rows, { positionRangeMin: 0 });
  assert.deepEqual(out.map(r => r.query), ['kept']);
  assert.ok(!JSON.stringify(out).includes('position 0.0'));
  assert.ok(!JSON.stringify(out).includes('NaN'));
});
