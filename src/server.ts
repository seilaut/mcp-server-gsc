import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  GetSitemapSchema,
  IndexInspectSchema,
  ListSitemapsSchema,
  SearchAnalyticsSchema,
  EnhancedSearchAnalyticsSchema,
  QuickWinsDetectionSchema,
  SubmitSitemapSchema,
} from './schemas.js';
import { z } from 'zod';
import { SearchConsoleService } from './search-console.js';
import { buildSearchAnalyticsBody } from './request-body.js';

function pickFallbackFields(data: unknown) {
  const d = (data ?? {}) as Record<string, unknown>;
  return d.answeredSiteUrl === undefined
    ? {}
    : { requestedSiteUrl: d.requestedSiteUrl, answeredSiteUrl: d.answeredSiteUrl, note: d.note };
}

export function createServer(credentials: string): Server {
  if (!credentials) {
    throw new Error('credentials parameter is required');
  }

  const server = new Server(
    {
      name: 'mcp-server-gsc',
      version: '0.3.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'list_sites',
          description: 'List all sites in Google Search Console',
          inputSchema: zodToJsonSchema(z.object({})),
        },
        {
          name: 'search_analytics',
          description: 'Get search performance data from Google Search Console',
          inputSchema: zodToJsonSchema(SearchAnalyticsSchema),
        },
        {
          name: 'enhanced_search_analytics',
          description: 'Enhanced search analytics with up to 25,000 rows, regex filters, and quick wins detection',
          inputSchema: zodToJsonSchema(EnhancedSearchAnalyticsSchema),
        },
        {
          name: 'detect_quick_wins',
          description: 'Automatically detect SEO quick wins and optimization opportunities',
          inputSchema: zodToJsonSchema(QuickWinsDetectionSchema),
        },
        {
          name: 'index_inspect',
          description: 'Inspect a URL to see if it is indexed or can be indexed',
          inputSchema: zodToJsonSchema(IndexInspectSchema),
        },
        {
          name: 'list_sitemaps',
          description: 'List sitemaps for a site in Google Search Console',
          inputSchema: zodToJsonSchema(ListSitemapsSchema),
        },
        {
          name: 'get_sitemap',
          description: 'Get a sitemap for a site in Google Search Console',
          inputSchema: zodToJsonSchema(GetSitemapSchema),
        },
        {
          name: 'submit_sitemap',
          description: 'Submit a sitemap for a site in Google Search Console',
          inputSchema: zodToJsonSchema(SubmitSitemapSchema),
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      if (!request.params.arguments) {
        throw new Error('Arguments are required');
      }

      const searchConsole = new SearchConsoleService(credentials);

      switch (request.params.name) {
        case 'enhanced_search_analytics': {
          const args = EnhancedSearchAnalyticsSchema.parse(request.params.arguments);
          const siteUrl = args.siteUrl;

          // Build enhanced request body (filters, including regex support, up to 25,000 rows)
          const requestBody = buildSearchAnalyticsBody(args, { groupType: 'and' });

          // Call enhanced search analytics
          const enhancedOptions = {
            regexFilter: args.regexFilter,
            enableQuickWins: args.enableQuickWins,
            quickWinsThresholds: args.quickWinsThresholds,
          };

          const response = await searchConsole.enhancedSearchAnalytics(siteUrl, requestBody, enhancedOptions);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
          };
        }

        case 'detect_quick_wins': {
          const args = QuickWinsDetectionSchema.parse(request.params.arguments);

          const requestBody: any = {
            startDate: args.startDate,
            endDate: args.endDate,
            dimensions: ['query', 'page'],
            rowLimit: 25000, // Maximum for comprehensive analysis
          };

          const quickWinsOptions = {
            enableQuickWins: true,
            quickWinsThresholds: {
              minImpressions: args.minImpressions,
              maxCtr: args.maxCtr,
              positionRangeMin: args.positionRangeMin,
              positionRangeMax: args.positionRangeMax,
            },
          };

          // One Search Console call (audit F16): enhancedSearchAnalytics runs the query
          // itself and adds the quick wins when rows come back.
          const enhancedResult = await searchConsole.enhancedSearchAnalytics(
            args.siteUrl,
            requestBody,
            quickWinsOptions
          );

          if (!enhancedResult.data.rows) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ message: 'No data available for quick wins analysis' }, null, 2),
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  quickWins: (enhancedResult.data as any).quickWins,
                  totalOpportunities: (enhancedResult.data as any).quickWins?.length || 0,
                  thresholds: quickWinsOptions.quickWinsThresholds,
                  analysis: 'Quick wins detection completed',
                  // Present only when the permission fallback answered (audit F8).
                  ...pickFallbackFields(enhancedResult.data),
                }, null, 2),
              },
            ],
          };
        }

        case 'search_analytics': {
          const args = SearchAnalyticsSchema.parse(request.params.arguments);
          const siteUrl = args.siteUrl;

          const requestBody = buildSearchAnalyticsBody(args);

          const response = await searchConsole.searchAnalytics(siteUrl, requestBody);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
          };
        }

        case 'list_sites': {
          const response = await searchConsole.listSites();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
          };
        }

        case 'index_inspect': {
          const args = IndexInspectSchema.parse(request.params.arguments);
          const requestBody = {
            siteUrl: args.siteUrl,
            inspectionUrl: args.inspectionUrl,
            languageCode: args.languageCode,
          };
          const response = await searchConsole.indexInspect(requestBody);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
          };
        }

        case 'list_sitemaps': {
          const args = ListSitemapsSchema.parse(request.params.arguments);
          const requestBody = {
            siteUrl: args.siteUrl,
            sitemapIndex: args.sitemapIndex,
          };
          const response = await searchConsole.listSitemaps(requestBody);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
          };
        }

        case 'get_sitemap': {
          const args = GetSitemapSchema.parse(request.params.arguments);
          const requestBody = {
            siteUrl: args.siteUrl,
            feedpath: args.feedpath,
          };
          const response = await searchConsole.getSitemap(requestBody);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
          };
        }

        case 'submit_sitemap': {
          const args = SubmitSitemapSchema.parse(request.params.arguments);
          const requestBody = {
            siteUrl: args.siteUrl,
            feedpath: args.feedpath,
          };
          const response = await searchConsole.submitSitemap(requestBody);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    } catch (error) {
      console.error(error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid arguments: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        );
      }
      throw error;
    }
  });

  return server;
}
