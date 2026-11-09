import { test } from 'node:test';
import assert from 'node:assert/strict';
import { google } from 'googleapis';
import { SearchConsoleService } from '../src/search-console.ts';

// Nothing here calls Google: google.searchconsole / google.webmasters are replaced by
// recorders and the auth client is a stub. The test proves which API version each method uses.

type Factory = (options: { version?: string }) => unknown;
const g = google as unknown as { searchconsole: Factory; webmasters: Factory };

async function withRecorders(run: (log: string[]) => Promise<void>) {
  const log: string[] = [];
  const originalSc = g.searchconsole;
  const originalWm = g.webmasters;
  const method = (name: string) => async (params?: unknown) => {
    log.push(`${name} ${JSON.stringify(params ?? null)}`);
    return { data: {} };
  };
  g.searchconsole = (options) => {
    log.push(`factory searchconsole ${options.version}`);
    return {
      searchanalytics: { query: method('searchanalytics.query') },
      sites: { list: method('sites.list') },
      sitemaps: { list: method('sitemaps.list'), get: method('sitemaps.get'), submit: method('sitemaps.submit') },
      urlInspection: { index: { inspect: method('inspect') } },
    };
  };
  g.webmasters = (options) => {
    log.push(`factory webmasters ${options.version}`);
    throw new Error('the Webmasters v3 client must not be used');
  };
  try {
    await run(log);
  } finally {
    g.searchconsole = originalSc;
    g.webmasters = originalWm;
  }
}

function service() {
  const svc = new SearchConsoleService('/nonexistent/key.json');
  (svc as unknown as { auth: { getClient: () => Promise<object> } }).auth = { getClient: async () => ({}) };
  return svc;
}

const calls: Array<[string, string, (s: SearchConsoleService) => Promise<unknown>]> = [
  ['searchAnalytics', 'searchanalytics.query', (s) => s.searchAnalytics('sc-domain:example.com', { startDate: '2026-01-01', endDate: '2026-01-02' })],
  ['listSites', 'sites.list', (s) => s.listSites()],
  ['listSitemaps', 'sitemaps.list', (s) => s.listSitemaps({ siteUrl: 'sc-domain:example.com' })],
  ['getSitemap', 'sitemaps.get', (s) => s.getSitemap({ siteUrl: 'sc-domain:example.com', feedpath: 'https://example.com/s.xml' })],
  ['submitSitemap', 'sitemaps.submit', (s) => s.submitSitemap({ siteUrl: 'sc-domain:example.com', feedpath: 'https://example.com/s.xml' })],
];

for (const [name, resource, call] of calls) {
  test(`${name} goes through Search Console v1, never Webmasters v3`, async () => {
    await withRecorders(async (log) => {
      await call(service());
      assert.deepEqual(log.filter((l) => l.startsWith('factory')), ['factory searchconsole v1']);
      assert.ok(log.some((l) => l.startsWith(`${resource} `)), `expected ${resource} in ${JSON.stringify(log)}`);
    });
  });
}

test('the service still requests only the webmasters.readonly scope', () => {
  // Construct without replacing auth: the scope is what Google would be asked to authorise.
  const svc = new SearchConsoleService('/nonexistent/key.json');
  const { scopes } = (svc as unknown as { auth: { scopes: unknown } }).auth;
  assert.deepEqual(scopes, ['https://www.googleapis.com/auth/webmasters.readonly']);
});
