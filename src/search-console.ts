import { google, searchconsole_v1, webmasters_v3 } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { detectQuickWins, type QuickWinsThresholds } from './quick-wins.js';
import { applyRegexFilter } from './request-body.js';
import { resolveCredentialConfig } from './credentials.js';
import { fallbackSiteUrls } from './site-url.js';
import type { PermissionFallbackError } from './fallback-labels.js';

type SearchanalyticsQueryRequest =
  webmasters_v3.Params$Resource$Searchanalytics$Query['requestBody'];
type ListSitemapsRequest = webmasters_v3.Params$Resource$Sitemaps$List;
type GetSitemapRequest = webmasters_v3.Params$Resource$Sitemaps$Get;
type SubmitSitemapRequest = webmasters_v3.Params$Resource$Sitemaps$Submit;
type IndexInspectRequest =
  searchconsole_v1.Params$Resource$Urlinspection$Index$Inspect['requestBody'];

export class SearchConsoleService {
  private auth: GoogleAuth;

  constructor(credentials: string) {
    this.auth = new google.auth.GoogleAuth({
      ...resolveCredentialConfig(credentials),
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
  }

  private async getWebmasters() {
    const authClient = await this.auth.getClient();
    return google.webmasters({
      version: 'v3',
      auth: authClient,
    } as webmasters_v3.Options);
  }

  private async getSearchConsole() {
    const authClient = await this.auth.getClient();
    return google.searchconsole({
      version: 'v1',
      auth: authClient,
    } as searchconsole_v1.Options);
  }

  /**
   * Runs `operation`; on a permission error retries once against the fallback
   * property. A fallback answer is labelled: `data` gains `requestedSiteUrl`,
   * `answeredSiteUrl` and `note`, so the caller never reads another property's
   * numbers as the requested one (audit F8). A primary success is returned as-is.
   * If the fallback itself throws, the original permission error is its `cause`.
   */
  private async handlePermissionError<T extends { data?: unknown }>(
    siteUrl: string | null | undefined,
    operation: () => Promise<T>,
    fallbackOperation: (fallbackSiteUrl: string) => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes('permission')) {
        let candidate: string | undefined;
        try {
          [candidate] = fallbackSiteUrls(siteUrl);
        } catch (urlErr) {
          // Keep Google's permission error reachable; the caller still sees the siteUrl message.
          throw urlErr instanceof Error ? new Error(urlErr.message, { cause: err }) : urlErr;
        }
        if (candidate === undefined) {
          throw err;
        }
        let result: T;
        try {
          result = await fallbackOperation(candidate);
        } catch (fallbackErr) {
          if (fallbackErr instanceof Error) {
            const typed: PermissionFallbackError = fallbackErr;
            // gaxios always sets its own cause (API detail), so overwrite; keep it reachable.
            if (typed.cause !== undefined) {
              typed.fallbackCause = typed.cause;
            }
            typed.cause = err;
            typed.requestedSiteUrl = siteUrl ?? undefined;
            typed.answeredSiteUrl = candidate;
          }
          throw fallbackErr;
        }
        const data =
          typeof result.data === 'object' && result.data !== null && !Array.isArray(result.data)
            ? result.data
            : result.data === undefined || result.data === ''
              ? {}
              : { result: result.data };
        return {
          ...result,
          data: {
            ...data,
            requestedSiteUrl: siteUrl,
            answeredSiteUrl: candidate,
            note: `Permission was refused for ${siteUrl}, so this answer comes from a different property: ${candidate}. Its numbers can cover more than the property you asked for (all subdomains and protocols).`,
          },
        };
      }
      throw err;
    }
  }

  async searchAnalytics(siteUrl: string, requestBody: SearchanalyticsQueryRequest) {
    const webmasters = await this.getWebmasters();
    return this.handlePermissionError(
      siteUrl,
      () => webmasters.searchanalytics.query({ siteUrl, requestBody }),
      (fallback) => webmasters.searchanalytics.query({ siteUrl: fallback, requestBody }),
    );
  }

  /**
   * Enhanced Search Analytics with advanced features
   * - Supports up to 25,000 rows (vs 1,000 default)
   * - Regex filtering capabilities
   * - Quick wins detection
   */
  async enhancedSearchAnalytics(
    siteUrl: string, 
    requestBody: SearchanalyticsQueryRequest,
    options: {
      regexFilter?: string;
      enableQuickWins?: boolean;
      quickWinsThresholds?: {
        minImpressions?: number;
        maxCtr?: number;
        positionRangeMin?: number;
        positionRangeMax?: number;
      };
    } = {}
  ) {
    // Ensure requestBody is defined
    if (!requestBody) {
      throw new Error('Request body is required');
    }

    // Apply regex filter if provided
    applyRegexFilter(requestBody, options.regexFilter);

    // Execute enhanced search analytics
    const result = await this.searchAnalytics(siteUrl, requestBody);
    
    // Apply quick wins detection if enabled
    if (options.enableQuickWins && result.data.rows) {
      const quickWins = this.detectQuickWins(result.data.rows, options.quickWinsThresholds);
      return {
        ...result,
        data: {
          ...result.data,
          quickWins: quickWins,
          enhancedFeatures: {
            regexFilterApplied: !!options.regexFilter,
            quickWinsEnabled: true,
            rowLimit: requestBody.rowLimit || 1000
          }
        }
      };
    }

    return result;
  }

  /**
   * Automatic Quick Wins Detection
   * Identifies SEO optimization opportunities
   */
  private detectQuickWins(
    rows: any[], 
    thresholds: QuickWinsThresholds = {}
  ) {
    return detectQuickWins(rows, thresholds);
  }

  async listSites() {
    const webmasters = await this.getWebmasters();
    return webmasters.sites.list();
  }

  async listSitemaps(requestBody: ListSitemapsRequest) {
    const webmasters = await this.getWebmasters();
    return this.handlePermissionError(
      requestBody.siteUrl,
      () => webmasters.sitemaps.list(requestBody),
      (fallback) =>
        webmasters.sitemaps.list({
          ...requestBody,
          siteUrl: fallback,
        }),
    );
  }

  async getSitemap(requestBody: GetSitemapRequest) {
    const webmasters = await this.getWebmasters();
    return this.handlePermissionError(
      requestBody.siteUrl,
      () => webmasters.sitemaps.get(requestBody),
      (fallback) =>
        webmasters.sitemaps.get({
          ...requestBody,
          siteUrl: fallback,
        }),
    );
  }

  async submitSitemap(requestBody: SubmitSitemapRequest) {
    const webmasters = await this.getWebmasters();
    return this.handlePermissionError(
      requestBody.siteUrl,
      () => webmasters.sitemaps.submit(requestBody),
      (fallback) =>
        webmasters.sitemaps.submit({
          ...requestBody,
          siteUrl: fallback,
        }),
    );
  }

  async indexInspect(requestBody: IndexInspectRequest) {
    const searchConsole = await this.getSearchConsole();
    return searchConsole.urlInspection.index.inspect({ requestBody });
  }
}
