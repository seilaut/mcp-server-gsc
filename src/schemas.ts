import { z } from 'zod';

// YYYY-MM-DD, and a real calendar day (rejects 2026-02-30). The message is fixed text, never the input.
const DATE_MESSAGE = 'Must be a date in YYYY-MM-DD format';
// One refine (not regex + refine) so a malformed date reports one issue.
const dateString = () =>
  z.string().refine((v) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, DATE_MESSAGE);

export const GSCBaseSchema = z.object({
  siteUrl: z
    .string()
    .describe(
      'The site URL as defined in Search Console. Example: sc-domain:example.com (for domain resources) or http://www.example.com/ (for site prefix resources)',
    ),
});

export const SearchAnalyticsSchema = GSCBaseSchema.extend({
  startDate: dateString().describe('Start date in YYYY-MM-DD format'),
  endDate: dateString().describe('End date in YYYY-MM-DD format'),
  dimensions: z
    .string()
    .transform((val) => val.split(',').map((d) => d.trim()))
    .refine((val) =>
      val.every((d) => ['query', 'page', 'country', 'device', 'date', 'searchAppearance'].includes(d)),
    )
    .optional()
    .describe(
      'Comma-separated list of dimensions to break down results by, such as query, page, country, device, date, searchAppearance',
    ),
  type: z
    .enum(['web', 'image', 'video', 'news', 'discover', 'googleNews'])
    .optional()
    .describe('Type of search to filter by, such as web, image, video, news, discover, googleNews'),
  aggregationType: z
    .enum(['auto', 'byNewsShowcasePanel', 'byProperty', 'byPage'])
    .optional()
    .describe('Type of aggregation, such as auto, byNewsShowcasePanel, byProperty, byPage'),
  rowLimit: z.number().int().min(1).max(25000).default(1000).describe('Maximum number of rows to return (up to 25,000 for enhanced performance)'),
  pageFilter: z.string().optional().describe('Filter by a specific page URL. Use with filterOperator.'),
  queryFilter: z.string().optional().describe('Filter by a specific query string. Use with filterOperator.'),
  countryFilter: z.string().optional().describe('Filter by a country using ISO 3166-1 alpha-3 code (e.g., USA, CHN).'),
  deviceFilter: z.enum(['DESKTOP', 'MOBILE', 'TABLET']).optional().describe('Filter by device type.'),
  filterOperator: z
    .enum(['equals', 'contains', 'notEquals', 'notContains', 'includingRegex', 'excludingRegex'])
    .default('equals')
    .optional()
    .describe('Operator for page and query filters. Defaults to "equals". Enhanced with regex support.'),
});

export const IndexInspectSchema = GSCBaseSchema.extend({
  inspectionUrl: z
    .string()
    .describe(
      'The fully-qualified URL to inspect. Must be under the property specified in "siteUrl"',
    ),
  languageCode: z
    .string()
    .optional()
    .default('en-US')
    .describe(
      'An IETF BCP-47 language code representing the language of the requested translated issue messages, such as "en-US" or "de-CH". Default is "en-US"',
    ),
});

export const ListSitemapsSchema = z.object({
  sitemapIndex: z
    .string()
    .optional()
    .describe(
      "A URL of a site's sitemap index. For example: http://www.example.com/sitemapindex.xml",
    ),
  siteUrl: z
    .string()
    .describe("The site's URL, including protocol. For example: http://www.example.com/"),
});

export const GetSitemapSchema = z.object({
  feedpath: z
    .string()
    .describe('The URL of the actual sitemap. For example: http://www.example.com/sitemap.xml'),
  siteUrl: z
    .string()
    .describe("The site's URL, including protocol. For example: http://www.example.com/"),
});

// Enhanced Quick Wins Detection Schema
export const QuickWinsDetectionSchema = GSCBaseSchema.extend({
  startDate: dateString().describe('Start date in YYYY-MM-DD format'),
  endDate: dateString().describe('End date in YYYY-MM-DD format'),
  minImpressions: z.number().default(50).describe('Minimum impressions threshold for quick wins'),
  maxCtr: z.number().default(2.0).describe('Maximum CTR percentage for quick wins detection'),
  positionRangeMin: z.number().default(4).describe('Minimum position for quick wins (default: 4)'),
  positionRangeMax: z.number().default(10).describe('Maximum position for quick wins (default: 10)'),
});

// Enhanced Search Analytics Schema with Quick Wins
export const EnhancedSearchAnalyticsSchema = SearchAnalyticsSchema.extend({
  regexFilter: z.string().optional().describe('RE2 regular expression the query must match (includingRegex). Sent to Search Console whatever dimensions you request.'),
  enableQuickWins: z.boolean().default(false).describe('Enable automatic quick wins detection'),
  quickWinsThresholds: QuickWinsDetectionSchema.pick({
    minImpressions: true,
    maxCtr: true,
    positionRangeMin: true,
    positionRangeMax: true,
  }).optional().describe('Custom thresholds for quick wins detection'),
});

export type SearchAnalytics = z.infer<typeof SearchAnalyticsSchema>;
export type EnhancedSearchAnalytics = z.infer<typeof EnhancedSearchAnalyticsSchema>;
export type QuickWinsDetection = z.infer<typeof QuickWinsDetectionSchema>;
export type IndexInspect = z.infer<typeof IndexInspectSchema>;