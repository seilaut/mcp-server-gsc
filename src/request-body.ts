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
 * Appends the enhanced tool's regex filter as an extra 'and' group when the
 * request breaks down by query. Mutates and returns requestBody, as the
 * inline code did.
 */
export function applyRegexFilter(requestBody: any, regexFilter?: string): any {
  if (regexFilter && requestBody.dimensions?.includes('query')) {
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
