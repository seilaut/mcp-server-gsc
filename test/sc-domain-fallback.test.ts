import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fallbackSiteUrls } from '../src/site-url.ts';
import { SearchConsoleService } from '../src/search-console.ts';

const PERMISSION = 'User does not have sufficient permission for site';

// A Domain property never carries "www.": the candidate for a www. URL is the bare domain.
test('a www. URL falls back to the bare domain, https and http', () => {
  assert.deepEqual(fallbackSiteUrls('https://www.example.com/'), ['sc-domain:example.com']);
  assert.deepEqual(fallbackSiteUrls('http://www.example.com'), ['sc-domain:example.com']);
});

test('only a leading www. is removed', () => {
  assert.deepEqual(fallbackSiteUrls('https://www.www.example.com/'), ['sc-domain:www.example.com']);
  assert.deepEqual(fallbackSiteUrls('https://awww.example.com/'), ['sc-domain:awww.example.com']);
  assert.deepEqual(fallbackSiteUrls('https://blog.example.com/'), ['sc-domain:blog.example.com']);
  assert.deepEqual(fallbackSiteUrls('https://example.com/'), ['sc-domain:example.com']);
});

test('a port or path does not leak into the domain candidate', () => {
  assert.deepEqual(fallbackSiteUrls('https://www.example.com:8443/a/b'), ['sc-domain:example.com']);
});

test('sc-domain: input is still never rewritten', () => {
  assert.deepEqual(fallbackSiteUrls('sc-domain:www.example.com'), []);
});

test('the answer names the property actually queried (answeredSiteUrl) and says it is broader', async () => {
  const queried: string[] = [];
  const svc = new SearchConsoleService('/nonexistent/key.json');
  (svc as unknown as { getSearchConsole: () => Promise<unknown> }).getSearchConsole = async () => ({
    searchanalytics: {
      query: async (p: { siteUrl: string }) => {
        queried.push(p.siteUrl);
        if (p.siteUrl.startsWith('http')) throw new Error(PERMISSION);
        return { data: { rows: [1] } };
      },
    },
  });
  const res: any = await svc.searchAnalytics('https://www.example.com/', {
    startDate: '2026-01-01', endDate: '2026-01-02',
  });
  assert.deepEqual(queried, ['https://www.example.com/', 'sc-domain:example.com']);
  assert.equal(res.data.requestedSiteUrl, 'https://www.example.com/');
  assert.equal(res.data.answeredSiteUrl, queried[1]);
  assert.match(res.data.note, /sc-domain:example\.com/);
  assert.match(res.data.note, /all subdomains and protocols/);
});
