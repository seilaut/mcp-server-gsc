import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.ts';
import { SearchConsoleService } from '../src/search-console.ts';
import { nameRequestedProperty, pickFallbackFields } from '../src/fallback-labels.ts';


// Nothing here calls Google: getWebmasters is replaced with a fake client.
const PERMISSION = 'User does not have sufficient permission for site';
const REQUESTED = 'https://www.example.com/';
const ANSWERED = 'sc-domain:www.example.com';

type Behaviour = (siteUrl: string) => unknown;

function fakeClient(behaviour: Behaviour) {
  const method = async (params: { siteUrl: string }) => ({ data: behaviour(params.siteUrl) });
  return {
    searchanalytics: { query: method },
    sitemaps: { list: method, get: method, submit: method },
  };
}

function serviceWith(client: unknown) {
  const svc = new SearchConsoleService('/nonexistent/key.json');
  (svc as unknown as { getWebmasters: () => Promise<unknown> }).getWebmasters = async () => client;
  return svc;
}

// Drives the server over an in-memory transport with raw JSON-RPC.
async function callTool(client: unknown, name: string, args: Record<string, unknown>) {
  const proto = SearchConsoleService.prototype as unknown as { getWebmasters: () => Promise<unknown> };
  const original = proto.getWebmasters;
  proto.getWebmasters = async () => client;
  const server = createServer('/nonexistent/key.json');
  const [a, b] = InMemoryTransport.createLinkedPair();
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    await server.connect(a);
    const reply = new Promise<any>((resolve) => {
      b.onmessage = (m: any) => {
        if (m.id === 1) resolve(m);
      };
    });
    await b.start();
    await b.send({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
    const m = await reply;
    if (m.error) return { isError: true, content: [{ text: String(m.error.message) }] };
    return m.result as { isError?: boolean; content: Array<{ text: string }> };
  } finally {
    console.error = originalConsoleError;
    proto.getWebmasters = original;
    await server.close();
  }
}

test('bad siteUrl after a permission error: the Google error is kept as cause', async () => {
  const original = new Error(PERMISSION);
  const svc = serviceWith(fakeClient(() => { throw original; }));
  await assert.rejects(
    () => svc.listSitemaps({ siteUrl: 'mysite.test' }),
    (e: any) => e instanceof Error && /Invalid siteUrl "mysite\.test"/.test(e.message) && e.cause === original,
  );
});

test('non-http siteUrl after a permission error: the Google error is kept as cause', async () => {
  const original = new Error(PERMISSION);
  const svc = serviceWith(fakeClient(() => { throw original; }));
  await assert.rejects(
    () => svc.listSitemaps({ siteUrl: 'ftp://example.com/' }),
    (e: any) => e instanceof Error && /Invalid siteUrl/.test(e.message) && e.cause === original,
  );
});

test('failed fallback: the error records both properties, typed', async () => {
  const original = new Error(PERMISSION);
  const svc = serviceWith(fakeClient((u) => { throw u === REQUESTED ? original : new Error('boom'); }));
  await assert.rejects(
    () => svc.listSitemaps({ siteUrl: REQUESTED }),
    (e: any) =>
      e.cause === original && e.requestedSiteUrl === REQUESTED && e.answeredSiteUrl === ANSWERED,
  );
});

test('server: a failed fallback names the property the caller asked for', async () => {
  const client = fakeClient((u) => {
    throw new Error(u === REQUESTED ? PERMISSION : `Fallback failed for ${u}`);
  });
  const res = await callTool(client, 'list_sitemaps', { siteUrl: REQUESTED });
  assert.equal(res.isError, true);
  const text = res.content[0].text;
  assert.match(text, /Fallback failed for sc-domain:www\.example\.com/);
  assert.ok(text.includes(`requested property: ${REQUESTED}`), text);
});

test('server: the requested property in that message is capped when long', async () => {
  const long = `https://${'y'.repeat(10000)}.com/`;
  const client = fakeClient((u) => {
    throw new Error(u === long ? PERMISSION : 'Fallback failed');
  });
  const res = await callTool(client, 'list_sitemaps', { siteUrl: long });
  assert.equal(res.isError, true);
  const text = res.content[0].text;
  assert.ok(text.length < 1000, `length ${text.length}`);
  assert.ok(!text.includes('y'.repeat(200)));
});

test('server: "No data available" after a fallback says which property answered', async () => {
  const client = fakeClient((u) => {
    if (u === REQUESTED) throw new Error(PERMISSION);
    return {}; // no rows
  });
  const res = await callTool(client, 'detect_quick_wins', {
    siteUrl: REQUESTED,
    startDate: '2026-01-01',
    endDate: '2026-01-31',
  });
  const body = JSON.parse(res.content[0].text);
  assert.match(body.message, /No data available/);
  assert.equal(body.requestedSiteUrl, REQUESTED);
  assert.equal(body.answeredSiteUrl, ANSWERED);
  assert.match(body.note, /different property/i);
});

test('server: "No data available" without a fallback carries no fallback fields', async () => {
  const res = await callTool(fakeClient(() => ({})), 'detect_quick_wins', {
    siteUrl: REQUESTED,
    startDate: '2026-01-01',
    endDate: '2026-01-31',
  });
  const body = JSON.parse(res.content[0].text);
  assert.match(body.message, /No data available/);
  assert.equal(body.answeredSiteUrl, undefined);
});

test('helper: nameRequestedProperty adds the requested property and keeps the original as cause', () => {
  const err = Object.assign(new Error('Fallback failed for sc-domain:www.example.com'), {
    requestedSiteUrl: REQUESTED,
    answeredSiteUrl: ANSWERED,
  });
  const out = nameRequestedProperty(err) as Error;
  assert.match(out.message, /^Fallback failed for sc-domain:www\.example\.com/);
  assert.ok(out.message.includes(`requested property: ${REQUESTED}`));
  assert.equal(out.cause, err);
});

test('helper: nameRequestedProperty caps a long requested property', () => {
  const long = `https://${'y'.repeat(10000)}.com/`;
  const err = Object.assign(new Error('x'), { requestedSiteUrl: long, answeredSiteUrl: 'sc-domain:a' });
  const out = nameRequestedProperty(err) as Error;
  assert.ok(out.message.length < 500, `length ${out.message.length}`);
  assert.ok(!out.message.includes('y'.repeat(200)));
});

test('helper: nameRequestedProperty leaves other errors and non-errors alone', () => {
  const plain = new Error('plain');
  assert.equal(nameRequestedProperty(plain), plain);
  assert.equal(nameRequestedProperty('text'), 'text');
});

test('helper: pickFallbackFields is empty for a primary answer, full for a fallback answer', () => {
  assert.deepEqual(pickFallbackFields({ rows: [] }), {});
  assert.deepEqual(pickFallbackFields(undefined), {});
  assert.deepEqual(
    pickFallbackFields({ requestedSiteUrl: REQUESTED, answeredSiteUrl: ANSWERED, note: 'n' }),
    { requestedSiteUrl: REQUESTED, answeredSiteUrl: ANSWERED, note: 'n' },
  );
});
