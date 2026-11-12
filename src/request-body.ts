// Pure request-body building for search_analytics and enhanced_search_analytics.
// Must not import googleapis (keeps it unit-testable).

export interface SearchAnalyticsArgs {
  startDate: string;
  endDate: string;
  dimensions?: string[];
  type?: string;
  aggregationType?: string;
  rowLimit?: number;
  pageFilter?: string;
  queryFilter?: string;
  countryFilter?: string;
  deviceFilter?: string;
  filterOperator?: string;
}

export interface FilterClause {
  dimension: string;
  operator: string | undefined;
  expression: string;
}

/**
 * Builds the body sent to searchanalytics.query. The two tools differ in one
 * way only: enhanced_search_analytics writes `groupType: 'and'` on the filter
 * group, search_analytics leaves it out. Pass `groupType: 'and'` for enhanced.
 */
export function buildSearchAnalyticsBody(
  args: SearchAnalyticsArgs,
  options: { groupType?: 'and' } = {}
): any {
  const requestBody: any = {
    startDate: args.startDate,
    endDate: args.endDate,
    dimensions: args.dimensions,
    searchType: args.type,
    aggregationType: args.aggregationType,
    rowLimit: args.rowLimit,
  };

  const filters: FilterClause[] = [];
  if (args.pageFilter) {
    filters.push({
      dimension: 'page',
      operator: args.filterOperator,
      expression: args.pageFilter,
    });
  }
  if (args.queryFilter) {
    filters.push({
      dimension: 'query',
      operator: args.filterOperator,
      expression: args.queryFilter,
    });
  }
  if (args.countryFilter) {
    filters.push({
      dimension: 'country',
      operator: 'equals', // Country filter only supports 'equals'
      expression: args.countryFilter,
    });
  }
  if (args.deviceFilter) {
    filters.push({
      dimension: 'device',
      operator: 'equals', // Device filter only supports 'equals'
      expression: args.deviceFilter,
    });
  }

  if (filters.length > 0) {
    requestBody.dimensionFilterGroups =
      options.groupType === 'and' ? [{ groupType: 'and', filters }] : [{ filters }];
  }

  return requestBody;
}

/**
 * Appends the enhanced tool's regex filter as an extra 'and' group on the query
 * dimension, whatever dimensions are requested: Search Console allows filtering
 * on a dimension you do not group by ("You can filter by any dimension listed
 * here, even if you are not grouping by that dimension"). Mutates and returns
 * requestBody.
 */
export function applyRegexFilter(requestBody: any, regexFilter?: string): any {
  if (regexFilter) {
    requestBody.dimensionFilterGroups = [
      ...(requestBody.dimensionFilterGroups || []),
      {
        groupType: 'and',
        filters: [{
          dimension: 'query',
          operator: 'includingRegex',
          expression: regexFilter
        }]
      }
    ];
  }
  return requestBody;
}

/** True only when the regex filter is in the body that is sent to Search Console. */
export function regexFilterWasSent(requestBody: any, regexFilter?: string): boolean {
  if (!regexFilter) return false;
  return (requestBody?.dimensionFilterGroups ?? []).some((g: any) =>
    (g?.filters ?? []).some(
      (f: any) => f.dimension === 'query' && f.operator === 'includingRegex' && f.expression === regexFilter,
    ),
  );
}
