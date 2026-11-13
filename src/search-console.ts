import { google, searchconsole_v1 } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { detectQuickWins, type QuickWinsThresholds } from './quick-wins.js';
import { applyRegexFilter, regexFilterWasSent } from './request-body.js';
import { resolveCredentialConfig } from './credentials.js';
import { fallbackSiteUrls } from './site-url.js';
import type { PermissionFallbackError } from './fallback-labels.js';

type SearchanalyticsQueryRequest =
  searchconsole_v1.Params$Resource$Searchanalytics$Query['requestBody'];
type ListSitemapsRequest = searchconsole_v1.Params$Resource$Sitemaps$List;
type GetSitemapRequest = searchconsole_v1.Params$Resource$Sitemaps$Get;
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

  private async getSearchConsole() {
    const authClient = await this.auth.getClient();
    return google.searchconsole({
      version: 'v1',
      auth: authClient,
    } as searchconsole_v1.Options);
  }

  /**
   * Runs `operation`; on a permission error retries against the fallback
   * properties in order (see fallbackSiteUrls), stopping at the first that is not refused. A fallback answer is labelled: `data` gains `requestedSiteUrl`,
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
        let candidates: string[];
        try {
          candidates = fallbackSiteUrls(siteUrl);
        } catch (urlErr) {
          // Keep Google's permission error reachable; the caller still sees the siteUrl message.
          throw urlErr instanceof Error ? new Error(urlErr.message, { cause: err }) : urlErr;
        }
        if (candidates.length === 0) {
          throw err;
        }
        // Try each candidate in order; move to the next only when this one is also refused for permission.
        let result: T | undefined;
        let candidate = candidates[0];
        for (const [i, c] of candidates.entries()) {
          candidate = c;
          try {
            result = await fallbackOperation(c);
            break;
          } catch (fallbackErr) {
            const refused =
              fallbackErr instanceof Error && fallbackErr.message.toLowerCase().includes('permission');
            if (refused && i < candidates.length - 1) continue;
            if (fallbackErr instanceof Error) {
              const typed: PermissionFallbackError = fallbackErr;
              // gaxios always sets its own cause (API detail), so overwrite; keep it reachable.
              if (typed.cause !== undefined) {
                typed.fallbackCause = typed.cause;
              }
              typed.cause = err;
              typed.requestedSiteUrl = siteUrl ?? undefined;
              typed.answeredSiteUrl = c;
            }
            throw fallbackErr;
          }
        }
        if (result === undefined) throw err; // unreachable: the loop returns or throws
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
    const searchConsole = await this.getSearchConsole();
    return this.handlePermissionError(
      siteUrl,
      () => searchConsole.searchanalytics.query({ siteUrl, requestBody }),
      (fallback) => searchConsole.searchanalytics.query({ siteUrl: fallback, requestBody }),
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
    const regexFilterApplied = regexFilterWasSent(requestBody, options.regexFilter);

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
            regexFilterApplied,
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
    const searchConsole = await this.getSearchConsole();
    return searchConsole.sites.list();
  }

  async listSitemaps(requestBody: ListSitemapsRequest) {
    const searchConsole = await this.getSearchConsole();
    return this.handlePermissionError(
      requestBody.siteUrl,
      () => searchConsole.sitemaps.list(requestBody),
      (fallback) =>
        searchConsole.sitemaps.list({
          ...requestBody,
          siteUrl: fallback,
        }),
    );
  }

  async getSitemap(requestBody: GetSitemapRequest) {
    const searchConsole = await this.getSearchConsole();
    return this.handlePermissionError(
      requestBody.siteUrl,
      () => searchConsole.sitemaps.get(requestBody),
      (fallback) =>
        searchConsole.sitemaps.get({
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
