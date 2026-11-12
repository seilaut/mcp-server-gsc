import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GaxiosError } from 'gaxios';
import { SearchConsoleService } from '../src/search-console.ts';

const PERMISSION = 'User does not have sufficient permission for site';

type Call = { siteUrl: string };

// Fake Search Console client: every method records its siteUrl and either succeeds or throws.
function fakeClient(behaviour: (siteUrl: string) => unknown, calls: Call[]) {
  const method = async (params: { siteUrl: string }) => {
    calls.push({ siteUrl: params.siteUrl });
    return { data: behaviour(params.siteUrl) };
  };
  return {
    searchanalytics: { query: method },
    sitemaps: { list: method, get: method },
  };
}

function serviceWith(client: unknown) {
  const svc = new SearchConsoleService('/nonexistent/key.json');
  // getSearchConsole is private; name the one member the test replaces instead of casting to any.
  (svc as unknown as { getSearchConsole: () => Promise<unknown> }).getSearchConsole = async () => client;
  return svc;
}

const REQUESTED = 'https://www.example.com/';
const ANSWERED = 'sc-domain:www.example.com';

const sites: Array<[string, (s: SearchConsoleService, u: string) => Promise<any>]> = [
  ['searchAnalytics', (s, u) => s.searchAnalytics(u, { startDate: '2026-01-01', endDate: '2026-01-02' })],
  ['listSitemaps', (s, u) => s.listSitemaps({ siteUrl: u })],
  ['getSitemap', (s, u) => s.getSitemap({ siteUrl: u, feedpath: 'https://www.example.com/s.xml' })],
];

for (const [name, call] of sites) {
  test(`${name}: primary succeeds, output has no fallback fields`, async () => {
    const calls: Call[] = [];
    const svc = serviceWith(fakeClient(() => ({ rows: [1] }), calls));
    const res = await call(svc, REQUESTED);
    assert.deepEqual(res.data, { rows: [1] });
    assert.deepEqual(calls, [{ siteUrl: REQUESTED }]);
  });

  test(`${name}: fallback answers, output names both properties`, async () => {
    const calls: Call[] = [];
    const svc = serviceWith(
      fakeClient((u) => {
        if (u === REQUESTED) throw new Error(PERMISSION);
        return { rows: [2] };
      }, calls),
    );
    const res = await call(svc, REQUESTED);
    assert.equal(res.data.rows[0], 2);
    assert.equal(res.data.requestedSiteUrl, REQUESTED);
    assert.equal(res.data.answeredSiteUrl, ANSWERED);
    assert.match(res.data.note, /different property/i);
    assert.match(res.data.note, /sc-domain:www\.example\.com/);
    assert.deepEqual(calls.map((c) => c.siteUrl), [REQUESTED, ANSWERED]);
  });
}

test('sc-domain: input fails with permission: original error rethrown, no fallback call', async () => {
  const calls: Call[] = [];
  const original = new Error(PERMISSION);
  const svc = serviceWith(fakeClient(() => { throw original; }, calls));
  await assert.rejects(() => svc.listSitemaps({ siteUrl: 'sc-domain:example.com' }), (e) => e === original);
  assert.equal(calls.length, 1);
});

test('fallback throws: the error carries the original permission error as cause', async () => {
  const calls: Call[] = [];
  const original = new Error(PERMISSION);
  const svc = serviceWith(
    fakeClient((u) => {
      if (u === REQUESTED) throw original;
      throw new Error('fallback also failed');
    }, calls),
  );
  await assert.rejects(
    () => svc.listSitemaps({ siteUrl: REQUESTED }),
    (e: any) => e instanceof Error && e.message === 'fallback also failed' && e.cause === original,
  );
});

test('fallback throws a GaxiosError that already has its own cause: cause is still the original; old cause kept as fallbackCause', async () => {
  const calls: Call[] = [];
  const original = new GaxiosError(PERMISSION, { url: 'u' } as any, { status: 403 } as any, { code: 403 } as any);
  const apiDetail = { code: 500, message: 'backend error' };
  const fallbackErr = new GaxiosError('fallback failed', { url: 'u' } as any, { status: 500 } as any, apiDetail as any);
  assert.notEqual(fallbackErr.cause, undefined); // precondition: gaxios sets cause itself
  const svc = serviceWith(
    fakeClient((u) => {
      if (u === REQUESTED) throw original;
      throw fallbackErr;
    }, calls),
  );
  await assert.rejects(
    () => svc.listSitemaps({ siteUrl: REQUESTED }),
    (e: any) => e === fallbackErr && e.cause === original && e.fallbackCause === apiDetail && e.status === 500,
  );
});
