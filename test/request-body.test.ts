import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSearchAnalyticsBody, applyRegexFilter } from '../src/request-body.ts';
import { SearchAnalyticsSchema, EnhancedSearchAnalyticsSchema } from '../src/schemas.ts';

const base = { startDate: '2026-01-01', endDate: '2026-01-31' };

// Exactly what the tool handlers do: schema parse, then build.
const search = (raw: Record<string, unknown>) =>
  buildSearchAnalyticsBody(SearchAnalyticsSchema.parse({ siteUrl: 'sc-domain:x.com', ...base, ...raw }));
const enhanced = (raw: Record<string, unknown>) =>
  buildSearchAnalyticsBody(
    EnhancedSearchAnalyticsSchema.parse({ siteUrl: 'sc-domain:x.com', ...base, ...raw }),
    { groupType: 'and' }
  );

test('no filters: no dimensionFilterGroups key at all, defaults applied', () => {
  assert.deepEqual(search({}), {
    startDate: '2026-01-01', endDate: '2026-01-31',
    dimensions: undefined, searchType: undefined, aggregationType: undefined, rowLimit: 1000,
  });
  assert.equal('dimensionFilterGroups' in search({}), false);
  assert.equal('dimensionFilterGroups' in enhanced({}), false);
});

test('empty-string filters count as no filter', () => {
  const body = search({ pageFilter: '', queryFilter: '', countryFilter: '' });
  assert.equal('dimensionFilterGroups' in body, false);
});

test('dimensions string is split and trimmed', () => {
  assert.deepEqual(search({ dimensions: 'query, page ,date' }).dimensions, ['query', 'page', 'date']);
});

test('rowLimit is passed through; type and aggregationType map to searchType/aggregationType', () => {
  const body = search({ rowLimit: 25000, type: 'discover', aggregationType: 'byPage' });
  assert.equal(body.rowLimit, 25000);
  assert.equal(body.searchType, 'discover');
  assert.equal(body.aggregationType, 'byPage');
});

for (const type of ['web', 'image', 'video', 'news', 'discover', 'googleNews']) {
  test(`type ${type} becomes searchType ${type}`, () => {
    assert.equal(search({ type }).searchType, type);
    assert.equal(enhanced({ type }).searchType, type);
  });
}

for (const op of ['equals', 'contains', 'notEquals', 'notContains', 'includingRegex', 'excludingRegex']) {
  test(`operator ${op} on a page filter`, () => {
    assert.deepEqual(search({ pageFilter: '/blog', filterOperator: op }), {
      startDate: '2026-01-01', endDate: '2026-01-31',
      dimensions: undefined, searchType: undefined, aggregationType: undefined, rowLimit: 1000,
      dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: op, expression: '/blog' }] }],
    });
  });
  test(`operator ${op} on a query filter, enhanced`, () => {
    assert.deepEqual(enhanced({ queryFilter: 'shoes', filterOperator: op }).dimensionFilterGroups, [
      { groupType: 'and', filters: [{ dimension: 'query', operator: op, expression: 'shoes' }] },
    ]);
  });
}

test('operator defaults to equals when not given (zod 4 applies the default inside optional)', () => {
  assert.deepEqual(search({ queryFilter: 'a' }).dimensionFilterGroups, [
    { filters: [{ dimension: 'query', operator: 'equals', expression: 'a' }] },
  ]);
});

test('multiple filters sit in one group (AND), in page, query, country, device order', () => {
  const body = search({
    deviceFilter: 'MOBILE', countryFilter: 'USA', queryFilter: 'shoes', pageFilter: '/shop',
    filterOperator: 'contains',
  });
  assert.deepEqual(body.dimensionFilterGroups, [{
    filters: [
      { dimension: 'page', operator: 'contains', expression: '/shop' },
      { dimension: 'query', operator: 'contains', expression: 'shoes' },
      { dimension: 'country', operator: 'equals', expression: 'USA' },
      { dimension: 'device', operator: 'equals', expression: 'MOBILE' },
    ],
  }]);
});

test('country and device filters always use equals, whatever filterOperator says', () => {
  const body = search({ countryFilter: 'GBR', deviceFilter: 'TABLET', filterOperator: 'notContains' });
  assert.deepEqual(body.dimensionFilterGroups, [{
    filters: [
      { dimension: 'country', operator: 'equals', expression: 'GBR' },
      { dimension: 'device', operator: 'equals', expression: 'TABLET' },
    ],
  }]);
});

test('enhanced: full body with all filters carries groupType and', () => {
  assert.deepEqual(
    enhanced({
      dimensions: 'query,page', type: 'googleNews', aggregationType: 'auto', rowLimit: 5000,
      pageFilter: '/p', queryFilter: 'q', countryFilter: 'DEU', deviceFilter: 'DESKTOP',
      filterOperator: 'notEquals',
    }),
    {
      startDate: '2026-01-01', endDate: '2026-01-31',
      dimensions: ['query', 'page'], searchType: 'googleNews', aggregationType: 'auto', rowLimit: 5000,
      dimensionFilterGroups: [{
        groupType: 'and',
        filters: [
          { dimension: 'page', operator: 'notEquals', expression: '/p' },
          { dimension: 'query', operator: 'notEquals', expression: 'q' },
          { dimension: 'country', operator: 'equals', expression: 'DEU' },
          { dimension: 'device', operator: 'equals', expression: 'DESKTOP' },
        ],
      }],
    }
  );
});

test('search_analytics group has no groupType key; enhanced has it', () => {
  assert.deepEqual(Object.keys(search({ pageFilter: '/a' }).dimensionFilterGroups[0]), ['filters']);
  assert.deepEqual(Object.keys(enhanced({ pageFilter: '/a' }).dimensionFilterGroups[0]), ['groupType', 'filters']);
});

test('regex filter with no existing groups adds one and-group on query', () => {
  const body = applyRegexFilter({ dimensions: ['query'] }, '^buy');
  assert.deepEqual(body.dimensionFilterGroups, [
    { groupType: 'and', filters: [{ dimension: 'query', operator: 'includingRegex', expression: '^buy' }] },
  ]);
});

test('regex filter keeps explicit dimensionFilterGroups and appends after them', () => {
  const explicit = { groupType: 'and', filters: [{ dimension: 'page', operator: 'contains', expression: '/blog' }] };
  const body = applyRegexFilter({ dimensions: ['query', 'page'], dimensionFilterGroups: [explicit] }, 'x$');
  assert.deepEqual(body.dimensionFilterGroups, [
    explicit,
    { groupType: 'and', filters: [{ dimension: 'query', operator: 'includingRegex', expression: 'x$' }] },
  ]);
});

test('regex filter combined with the enhanced builder output', () => {
  const body = applyRegexFilter(enhanced({ dimensions: 'query', pageFilter: '/a', filterOperator: 'equals' }), 'z');
  assert.equal(body.dimensionFilterGroups.length, 2);
  assert.deepEqual(body.dimensionFilterGroups[0].filters, [{ dimension: 'page', operator: 'equals', expression: '/a' }]);
  assert.equal(body.dimensionFilterGroups[1].filters[0].expression, 'z');
});

test('regex filter: empty string adds nothing', () => {
  assert.equal('dimensionFilterGroups' in applyRegexFilter({ dimensions: ['query'] }, ''), false);
  assert.equal('dimensionFilterGroups' in applyRegexFilter({ dimensions: ['query'] }, undefined), false);
});

test('regex filter is not silently dropped when query is not a dimension', () => {
  const body = applyRegexFilter({ dimensions: ['page'] }, 'x');
  assert.equal(body.dimensionFilterGroups?.length, 1);
});

test('startRow and dataState are not exposed by the schemas, so never appear in the body', () => {
  const body = search({ startRow: 100, dataState: 'all' });
  assert.equal('startRow' in body, false);
  assert.equal('dataState' in body, false);
});
