import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.ts';
import { SearchConsoleService } from '../src/search-console.ts';

const PERMISSION = 'User does not have sufficient permission for site';
const REQUESTED = 'https://www.example.com/';
const ANSWERED = 'sc-domain:example.com';

// Fixed input (ctr is a fraction, as Search Console returns it). Only the first and third qualify
// under the default thresholds (impressions >= 50, ctr <= 2, position 4..10).
const ROWS = [
  { keys: ['buy shoes', '/shoes'], clicks: 5, impressions: 1000, ctr: 0.005, position: 6 },
  { keys: ['top query', '/'], clicks: 500, impressions: 1000, ctr: 0.5, position: 1 },
  { keys: ['red shoes', '/red'], clicks: 2, impressions: 300, ctr: 0.0067, position: 8.5 },
];

type Call = { siteUrl: string; requestBody: unknown };

async function connect(behaviour: (siteUrl: string) => unknown, calls: Call[]) {
  const original = (SearchConsoleService.prototype as any).getSearchConsole;
  (SearchConsoleService.prototype as any).getSearchConsole = async () => ({
    searchanalytics: {
      query: async (p: { siteUrl: string; requestBody: unknown }) => {
        calls.push({ siteUrl: p.siteUrl, requestBody: p.requestBody });
        return { data: behaviour(p.siteUrl) };
      },
    },
  });
  const server = createServer('/nonexistent/key.json');
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'qw-test', version: '0.0.0' });
  await Promise.all([server.connect(a), client.connect(b)]);
  return {
    client,
    async close() {
      (SearchConsoleService.prototype as any).getSearchConsole = original;
      await client.close();
      await server.close();
    },
  };
}

const args = { siteUrl: REQUESTED, startDate: '2026-01-01', endDate: '2026-01-31' };
const text = (res: any) => JSON.parse(res.content[0].text);

test('detect_quick_wins: exactly one Search Console call when the first property answers', async () => {
  const calls: Call[] = [];
  const h = await connect(() => ({ rows: ROWS }), calls);
  try {
    await h.client.callTool({ name: 'detect_quick_wins', arguments: args });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].siteUrl, REQUESTED);
    assert.equal((calls[0].requestBody as any).rowLimit, 25000);
  } finally {
    await h.close();
  }
});

test('detect_quick_wins: no rows is one call and the plain message', async () => {
  const calls: Call[] = [];
  const h = await connect(() => ({}), calls);
  try {
    const out = text(await h.client.callTool({ name: 'detect_quick_wins', arguments: args }));
    assert.equal(calls.length, 1);
    assert.deepEqual(out, { message: 'No data available for quick wins analysis' });
  } finally {
    await h.close();
  }
});

test('detect_quick_wins: permission fallback makes one call per property attempt and labels the answer', async () => {
  const calls: Call[] = [];
  const h = await connect((u) => {
    if (u === REQUESTED) throw new Error(PERMISSION);
    return { rows: ROWS };
  }, calls);
  try {
    const out = text(await h.client.callTool({ name: 'detect_quick_wins', arguments: args }));
    assert.deepEqual(calls.map((c) => c.siteUrl), [REQUESTED, ANSWERED]);
    assert.equal(out.requestedSiteUrl, REQUESTED);
    assert.equal(out.answeredSiteUrl, ANSWERED);
    assert.match(out.note, /different property/i);
  } finally {
    await h.close();
  }
});

test('detect_quick_wins: output keys, order and values are unchanged for a fixed input', async () => {
  const calls: Call[] = [];
  const h = await connect(() => ({ rows: ROWS }), calls);
  try {
    const out = text(await h.client.callTool({ name: 'detect_quick_wins', arguments: args }));
    assert.deepEqual(Object.keys(out), ['quickWins', 'totalOpportunities', 'thresholds', 'analysis']);
    assert.equal(out.totalOpportunities, 2);
    assert.equal(out.quickWins.length, 2);
    assert.deepEqual(out.thresholds, { minImpressions: 50, maxCtr: 2, positionRangeMin: 4, positionRangeMax: 10 });
    assert.equal(out.analysis, 'Quick wins detection completed');
    // 1000 impressions: potential 50, +45; 300 impressions: potential 15, +13. Sorted by additionalClicks.
    assert.deepEqual(out.quickWins, [
      { query: 'buy shoes', page: '/shoes', currentPosition: 6, impressions: 1000, currentClicks: 5, currentCtr: 0.5, potentialClicks: 50, additionalClicks: 45, opportunity: 'High', optimizationNote: 'Move from position 6.0 to improve CTR' },
      { query: 'red shoes', page: '/red', currentPosition: 8.5, impressions: 300, currentClicks: 2, currentCtr: 0.67, potentialClicks: 15, additionalClicks: 13, opportunity: 'High', optimizationNote: 'Move from position 8.5 to improve CTR' },
    ]);
  } finally {
    await h.close();
  }
});

test('tools/list no longer advertises regexFilter on search_analytics, estimatedClickValue or conversionRate', async () => {
  const h = await connect(() => ({}), []);
  try {
    const { tools } = await h.client.listTools();
    const props = (name: string) => Object.keys((tools.find((t) => t.name === name)!.inputSchema as any).properties);
    assert.equal(props('search_analytics').includes('regexFilter'), false);
    assert.equal(props('detect_quick_wins').includes('estimatedClickValue'), false);
    assert.equal(props('detect_quick_wins').includes('conversionRate'), false);
    for (const t of tools) {
      const p = props(t.name);
      assert.equal(p.includes('estimatedClickValue') || p.includes('conversionRate'), false, t.name);
    }
    // enhanced_search_analytics really uses regexFilter, so it stays.
    assert.equal(props('enhanced_search_analytics').includes('regexFilter'), true);
  } finally {
    await h.close();
  }
});
