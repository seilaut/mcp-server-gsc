import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.ts';
import { SearchConsoleService } from '../src/search-console.ts';
import { applyRegexFilter, regexFilterWasSent } from '../src/request-body.ts';

// Google: "You can filter by any dimension listed here, even if you are not grouping by that dimension."
// (developers.google.com/webmaster-tools/v1/searchanalytics/query, fetched 2026-11-12). So the filter is sent
// whatever dimensions are requested.

const REGEX_GROUP = {
  groupType: 'and',
  filters: [{ dimension: 'query', operator: 'includingRegex', expression: '^buy' }],
};

test('regexFilter is sent when dimensions is only page', () => {
  const body = applyRegexFilter({ dimensions: ['page'] }, '^buy');
  assert.deepEqual(body.dimensionFilterGroups, [REGEX_GROUP]);
});

test('regexFilter is sent when no dimensions are requested', () => {
  assert.deepEqual(applyRegexFilter({}, '^buy').dimensionFilterGroups, [REGEX_GROUP]);
});

test('regexFilter is sent when dimensions includes query, after explicit groups', () => {
  const explicit = { groupType: 'and', filters: [{ dimension: 'page', operator: 'contains', expression: '/a' }] };
  const body = applyRegexFilter({ dimensions: ['query'], dimensionFilterGroups: [explicit] }, '^buy');
  assert.deepEqual(body.dimensionFilterGroups, [explicit, REGEX_GROUP]);
});

test('empty or missing regexFilter adds nothing and is reported as not sent', () => {
  for (const r of ['', undefined]) {
    const body = applyRegexFilter({ dimensions: ['page'] }, r);
    assert.equal('dimensionFilterGroups' in body, false);
    assert.equal(regexFilterWasSent(body, r), false);
  }
});

test('regexFilterWasSent is true only when the filter is in the body', () => {
  assert.equal(regexFilterWasSent(applyRegexFilter({ dimensions: ['page'] }, '^buy'), '^buy'), true);
  assert.equal(regexFilterWasSent({ dimensions: ['page'] }, '^buy'), false);
});

async function connect(calls: any[]) {
  const original = (SearchConsoleService.prototype as any).getSearchConsole;
  (SearchConsoleService.prototype as any).getSearchConsole = async () => ({
    searchanalytics: {
      query: async (p: any) => {
        calls.push(p.requestBody);
        return { data: { rows: [{ keys: ['x'], clicks: 1, impressions: 100, ctr: 0.01, position: 5 }] } };
      },
    },
  });
  const server = createServer('/nonexistent/key.json');
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'rf-test', version: '0.0.0' });
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

test('enhanced_search_analytics with dimensions=page sends the regex to Search Console and reports it applied', async () => {
  const calls: any[] = [];
  const h = await connect(calls);
  try {
    const res: any = await h.client.callTool({
      name: 'enhanced_search_analytics',
      arguments: {
        siteUrl: 'sc-domain:example.com', startDate: '2026-01-01', endDate: '2026-01-31',
        dimensions: 'page', regexFilter: '^buy', enableQuickWins: true,
      },
    });
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].dimensionFilterGroups, [REGEX_GROUP]);
    assert.equal(JSON.parse(res.content[0].text).enhancedFeatures.regexFilterApplied, true);
  } finally {
    await h.close();
  }
});

test('regexFilterApplied is false when no regexFilter was given', async () => {
  const calls: any[] = [];
  const h = await connect(calls);
  try {
    const res: any = await h.client.callTool({
      name: 'enhanced_search_analytics',
      arguments: {
        siteUrl: 'sc-domain:example.com', startDate: '2026-01-01', endDate: '2026-01-31',
        dimensions: 'page', enableQuickWins: true,
      },
    });
    assert.equal('dimensionFilterGroups' in calls[0], false);
    assert.equal(JSON.parse(res.content[0].text).enhancedFeatures.regexFilterApplied, false);
  } finally {
    await h.close();
  }
});

test('README matches the code: no "silently ignored" promise and no regex: prefix', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.equal(/silently ignored/i.test(readme), false);
  assert.equal(/even if it was ignored/i.test(readme), false);
  assert.match(readme, /There is no `regex:` prefix/);
});
