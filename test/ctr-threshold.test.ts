import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectQuickWins } from '../src/quick-wins.ts';

// ctr is a fraction as Search Console returns it; maxCtr is a percentage.
const row = (ctr: number) => ({ keys: ['q', '/p'], clicks: 1, impressions: 1000, ctr, position: 5 });
const kept = (ctr: number, maxCtr: number) => detectQuickWins([row(ctr)], { maxCtr }).length === 1;

test('a whole-percentage threshold matches a row exactly at the boundary', () => {
  assert.equal(kept(0.07, 7), true);
  assert.equal(kept(0.02, 2), true);
  assert.equal(kept(0.03, 3), true);
  assert.equal(kept(0.29, 29), true);
});

test('a decimal threshold matches a row exactly at the boundary', () => {
  assert.equal(kept(0.025, 2.5), true);
  assert.equal(kept(0.0007, 0.07), true);
  assert.equal(kept(0.0175, 1.75), true);
});

test('a row just above the threshold is excluded', () => {
  assert.equal(kept(0.0701, 7), false);
  assert.equal(kept(0.07000001, 7), false);
  assert.equal(kept(0.0251, 2.5), false);
  assert.equal(kept(0.00071, 0.07), false);
});

test('a row below the threshold is included', () => {
  assert.equal(kept(0.0699, 7), true);
  assert.equal(kept(0.0249, 2.5), true);
});

test('the default threshold (2) is exact at 0.02 too, and 0.0201 is out', () => {
  assert.equal(detectQuickWins([row(0.02)]).length, 1);
  assert.equal(detectQuickWins([row(0.0201)]).length, 0);
});

test('a missing ctr counts as 0 and passes', () => {
  assert.equal(detectQuickWins([{ ...row(0.01), ctr: undefined }], { maxCtr: 1 }).length, 1);
});
