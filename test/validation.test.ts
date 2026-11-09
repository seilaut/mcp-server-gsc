import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  SearchAnalyticsSchema,
  EnhancedSearchAnalyticsSchema,
  QuickWinsDetectionSchema,
  ListSitemapsSchema,
  GetSitemapSchema,
  SubmitSitemapSchema,
} from '../src/schemas.ts';
import { createServer } from '../src/server.ts';
import { SearchConsoleService } from '../src/search-console.ts';

const site = 'sc-domain:example.com';
const base = { siteUrl: site, startDate: '2026-01-01', endDate: '2026-01-31' };

const dateSchemas = {
  search: SearchAnalyticsSchema,
  enhanced: EnhancedSearchAnalyticsSchema,
  quickWins: QuickWinsDetectionSchema,
};

test('dates: valid YYYY-MM-DD is accepted by every schema that has dates', () => {
  for (const [name, s] of Object.entries(dateSchemas)) {
    assert.equal(s.safeParse(base).success, true, name);
    assert.equal(s.safeParse({ ...base, startDate: '2024-02-29' }).success, true, `${name} leap day`);
  }
});

test('dates: bad shapes and impossible dates are rejected, in both fields, in every schema', () => {
  const bad = ['2026-13-01', '2026-1-5', 'yesterday', '', '2026-02-30', '2026-01-01T00:00:00Z', ' 2026-01-01', '20260101'];
  for (const [name, s] of Object.entries(dateSchemas)) {
    for (const d of bad) {
      assert.equal(s.safeParse({ ...base, startDate: d }).success, false, `${name} startDate ${JSON.stringify(d)}`);
      assert.equal(s.safeParse({ ...base, endDate: d }).success, false, `${name} endDate ${JSON.stringify(d)}`);
    }
  }
});

test('dates: the error message does not echo long input back', () => {
  const long = 'x'.repeat(5000);
  const r = SearchAnalyticsSchema.safeParse({ ...base, startDate: long });
  assert.equal(r.success, false);
  assert.ok(JSON.stringify(r.error!.issues).length < 500);
});

test('rowLimit: integers accepted, non-integers rejected, bounds unchanged', () => {
  const ok = (n: unknown) => SearchAnalyticsSchema.safeParse({ ...base, rowLimit: n }).success;
  for (const n of [1, 10, 1000, 25000]) assert.equal(ok(n), true, String(n));
  for (const n of [10.5, 0.5, 1.0000001, 24999.9]) assert.equal(ok(n), false, String(n));
  for (const n of [0, -1, 25001]) assert.equal(ok(n), false, String(n));
  assert.equal(SearchAnalyticsSchema.parse(base).rowLimit, 1000);
  assert.equal(EnhancedSearchAnalyticsSchema.safeParse({ ...base, rowLimit: 10.5 }).success, false);
});

test('sitemaps: Google requires siteUrl for list, siteUrl and feedpath for get and submit', () => {
  const u = 'http://www.example.com/';
  const f = 'http://www.example.com/sitemap.xml';
  assert.equal(ListSitemapsSchema.safeParse({}).success, false);
  assert.equal(ListSitemapsSchema.safeParse({ siteUrl: u }).success, true);
  assert.equal(ListSitemapsSchema.safeParse({ siteUrl: u, sitemapIndex: f }).success, true);
  assert.equal(GetSitemapSchema.safeParse({ siteUrl: u }).success, false);
  assert.equal(GetSitemapSchema.safeParse({ feedpath: f }).success, false);
  assert.equal(GetSitemapSchema.safeParse({}).success, false);
  assert.equal(GetSitemapSchema.safeParse({ siteUrl: u, feedpath: f }).success, true);
  assert.equal(SubmitSitemapSchema.safeParse({ siteUrl: u }).success, false);
  assert.equal(SubmitSitemapSchema.safeParse({ feedpath: f }).success, false);
  assert.equal(SubmitSitemapSchema.safeParse({ siteUrl: u, feedpath: f }).success, true);
});

async function connect() {
  const original = (SearchConsoleService.prototype as any).getWebmasters;
  (SearchConsoleService.prototype as any).getWebmasters = async () => ({
    sites: { list: async () => ({ data: { siteEntry: [{ siteUrl: site, permissionLevel: 'siteOwner' }] } }) },
  });
  const server = createServer('/nonexistent/key.json');
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'validation-test', version: '0.0.0' });
  await Promise.all([server.connect(a), client.connect(b)]);
  return {
    client,
    async close() {
      (SearchConsoleService.prototype as any).getWebmasters = original;
      await client.close();
      await server.close();
    },
  };
}

test('list_sites works with arguments omitted, and with an empty object', async () => {
  const h = await connect();
  try {
    for (const params of [{ name: 'list_sites' }, { name: 'list_sites', arguments: {} }]) {
      const res: any = await h.client.callTool(params);
      assert.notEqual(res.isError, true, JSON.stringify(params));
      assert.equal(JSON.parse(res.content[0].text).siteEntry[0].siteUrl, site);
    }
  } finally {
    await h.close();
  }
});

test('other tools still reject omitted arguments', async () => {
  const h = await connect();
  try {
    await assert.rejects(() => h.client.callTool({ name: 'search_analytics' }), /Arguments are required/);
  } finally {
    await h.close();
  }
});

test('a malformed date reports exactly one issue', () => {
  for (const d of ['yesterday', '2026-1-5', '2026-02-30', '']) {
    const r = SearchAnalyticsSchema.safeParse({ ...base, startDate: d });
    assert.equal(r.success, false);
    assert.equal(r.error!.issues.length, 1, d);
  }
});

test('tools/list advertises startDate and endDate as plain strings with no $ref', async () => {
  const h = await connect();
  try {
    const { tools } = await h.client.listTools();
    for (const name of ['search_analytics', 'enhanced_search_analytics', 'detect_quick_wins']) {
      const props = (tools.find((t) => t.name === name)!.inputSchema as any).properties;
      for (const f of ['startDate', 'endDate']) {
        assert.equal(props[f].type, 'string', `${name}.${f} type`);
        assert.equal(props[f].$ref, undefined, `${name}.${f} $ref`);
        assert.ok(props[f].description, `${name}.${f} description`);
      }
    }
  } finally {
    await h.close();
  }
});
