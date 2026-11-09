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

test('a row with no position counts as position 0 once the range allows it, and never gives NaN', () => {
  const out = detectQuickWins([row({ position: undefined })], { positionRangeMin: 0 });
  assert.equal(out.length, 1);
  assert.equal(out[0].currentPosition, 0);
  assert.equal(out[0].optimizationNote, 'Move from position 0.0 to improve CTR');
  assert.ok(!JSON.stringify(out).includes('NaN'));
});
