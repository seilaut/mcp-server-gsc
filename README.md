# Google Search Console MCP Server

A Model Context Protocol (MCP) server providing comprehensive access to Google Search Console data with enhanced analytics capabilities.

## Features

- **Search analytics**: performance data from Search Console, up to 25,000 rows per request (default 1,000)
- **Filters**: page, query, country and device filters, with the operators listed below
- **Quick wins**: `detect_quick_wins`, or `enableQuickWins` on `enhanced_search_analytics`, lists queries that rank on page one or two but get few clicks
- **Sites, sitemaps and URL inspection**: list sites, list, get and submit sitemaps, inspect a URL

### Sponsored by

<a href="https://macuse.app?ref=mcp-server-gsc">
    <img src="https://macuse.app/logo-pill.png" width="200" alt="macuse.app">
</a>

[macuse.app](https://macuse.app) is a native macOS application that gives your AI superpowers by integrating AI assistants with macOS apps like Calendar, Mail, and Notes, plus universal UI control for any application. Supports Claude Desktop, Cursor, and Raycast with one-click setup. Privacy-first, runs locally.

## Prerequisites

- Node.js 22 or later
- Google Cloud Project with Search Console API enabled
- Service Account credentials with Search Console access

## Installation

Install this fork from source. The package of the same name on npm is the upstream project, not this fork, so do not install it from there.

```bash
git clone https://github.com/seilaut/mcp-server-gsc.git
cd mcp-server-gsc
npm ci
npm run build
```

`npm ci` installs from `package-lock.json` (the only lockfile). The build writes `dist/index.js`, the server's entry point.

## Authentication Setup

To obtain Google Search Console API credentials:

1. Visit the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the API:

- Go to "APIs & Services" > "Library"
- Search for and enable ["Search Console API"](https://console.cloud.google.com/marketplace/product/google/searchconsole.googleapis.com)

4. Create credentials:

- Navigate to ["APIs & Services" > "Credentials"](https://console.cloud.google.com/apis/credentials)
- Click "Create Credentials" > "Service Account"
- Fill in the service account details
- Create a new key in JSON format
- The credentials file (.json) will download automatically

5. Grant access:

- Open Search Console
- Add the service account email (format: name@project.iam.gserviceaccount.com) as a user of the property. The server requests a read-only scope, so the lowest permission level that lets you read the data is enough (property administrator is more than it needs)

## Usage

The server reads its credentials from the `GOOGLE_APPLICATION_CREDENTIALS` environment variable. The value is either the path to a service account key file or the key JSON itself. The server requests the `webmasters.readonly` scope only.

### Claude Desktop Configuration

Point `command` at Node and `args` at the `dist/index.js` you built (use the absolute path of your clone):

```json
{
  "mcpServers": {
    "gsc": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-gsc/dist/index.js"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/credentials.json"
      }
    }
  }
}
```

### Remote (Cloudflare Worker)

`src/remote.ts` serves the same tools over HTTP at `/mcp` (health check at `/health`). It reads the `GOOGLE_CREDENTIALS` secret (same value format as above). If `MCP_API_TOKEN` is set, requests need that bearer token. If it is not set, `/mcp` has no authentication: anyone who finds the URL can call the tools and read every property the service account can see, so set the token before you deploy. Whether to keep the Worker at all is still an open decision (T3.5.1). `CORS_ORIGIN` sets the allowed origin (default `*`). Scripts: `npm run dev:remote`, `npm run deploy`.

### Permission fallback

When Search Console refuses permission for the property you named, `search_analytics`, `enhanced_search_analytics`, `detect_quick_wins` and the three sitemap tools retry once against the domain property (`sc-domain:<hostname>`) of an `http://` or `https://` `siteUrl`; an `sc-domain:` `siteUrl` is never retried. A fallback answer carries `requestedSiteUrl`, `answeredSiteUrl` and `note` in the result, because its numbers can cover more than the property you asked for. `detect_quick_wins` carries the same three fields on its "No data available" message when the fallback returned no rows. If the retry itself fails, the cause of the error the server raises is the retry's own error, and Google's original permission error is that error's `cause` (the retry's error, with that cause, is logged on the server's stderr), but the client sees only the error message: the retry's message, plus the property you asked for and the one retried. Google's original permission reason is not sent to the client. `list_sites` and `index_inspect` do not retry.

## Available Tools

The server lists eight tools: `list_sites`, `search_analytics`, `enhanced_search_analytics`, `detect_quick_wins`, `index_inspect`, `list_sitemaps`, `get_sitemap` and `submit_sitemap`. Unknown parameters are ignored, not rejected. Invalid values (a bad date, an unlisted dimension) are rejected with an error.

### list_sites

List all sites in Google Search Console. Takes no parameters.

### search_analytics

Get search performance data from Google Search Console.

**Required Parameters:**

- `siteUrl`: Site URL (format: `http://www.example.com/` or `sc-domain:example.com`)
- `startDate`: Start date (YYYY-MM-DD, a real calendar day)
- `endDate`: End date (YYYY-MM-DD, a real calendar day)

**Optional Parameters:**

- `dimensions`: Comma-separated list (`query`, `page`, `country`, `device`, `searchAppearance`, `date`)
- `type`: Search type (`web`, `image`, `video`, `news`, `discover`, `googleNews`)
- `aggregationType`: Aggregation method (`auto`, `byNewsShowcasePanel`, `byProperty`, `byPage`)
- `rowLimit`: Maximum rows to return (default: 1000, min: 1, max: 25000)

**Filter Parameters:**

- `pageFilter`: Filter by page URL, compared using `filterOperator`
- `queryFilter`: Filter by search query, compared using `filterOperator`
- `countryFilter`: Filter by country ISO 3166-1 alpha-3 code (e.g., `USA`, `CHN`); always `equals`
- `deviceFilter`: Filter by device type (`DESKTOP`, `MOBILE`, `TABLET`); always `equals`
- `filterOperator`: Operator for `pageFilter` and `queryFilter` (`equals`, `contains`, `notEquals`, `notContains`, `includingRegex`, `excludingRegex`). If you leave it out, the server sends no operator.

The regex operators pass your expression to Search Console as written. There is no `regex:` prefix: write the pattern itself.

### enhanced_search_analytics

Takes every parameter of `search_analytics`, and adds:

- `regexFilter`: A regular expression matched against the query with `includingRegex`. It is applied only when `dimensions` includes `query`; otherwise it is silently ignored.
- `enableQuickWins`: Add a `quickWins` list to the result (default: `false`). Added only when rows come back.
- `quickWinsThresholds`: Optional object with `minImpressions` (default `50`), `maxCtr` (percentage, default `2`), `positionRangeMin` (default `4`) and `positionRangeMax` (default `10`).

When `enableQuickWins` is on and rows come back, the response also carries `enhancedFeatures`, whose `regexFilterApplied` field is true whenever `regexFilter` was given, even if it was ignored for the reason above.

### detect_quick_wins

Finds queries that rank just off the top but earn few clicks. It always queries by `query` and `page` with up to 25,000 rows.

**Required Parameters:**

- `siteUrl`, `startDate`, `endDate`: as for `search_analytics`

**Optional Parameters:**

- `minImpressions`: Minimum impressions (default: `50`)
- `maxCtr`: Maximum CTR as a percentage (default: `2`)
- `positionRangeMin`: Minimum position (default: `4`)
- `positionRangeMax`: Maximum position (default: `10`)

The result lists `quickWins`, `totalOpportunities` and the `thresholds` used. Each quick win estimates the extra clicks at a 5% CTR.

### index_inspect

Inspect a URL to see if it is indexed or can be indexed.

- `siteUrl` (required): the property, as in Search Console
- `inspectionUrl` (required): the fully-qualified URL to inspect; must be under `siteUrl`
- `languageCode` (optional): IETF BCP-47 code for the issue messages (default: `en-US`)

### list_sitemaps

- `siteUrl` (required): the site's URL, including protocol
- `sitemapIndex` (optional): URL of a sitemap index to list

### get_sitemap

- `siteUrl` (required): the site's URL, including protocol
- `feedpath` (required): URL of the sitemap

### submit_sitemap

- `siteUrl` (required): the site's URL, including protocol
- `feedpath` (required): URL of the sitemap to add

The server requests only the read-only Search Console scope (`webmasters.readonly`). `submit_sitemap` is untested under that scope, and Google may refuse it.

**Example - Basic Query:**

```json
{
  "siteUrl": "https://example.com",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "dimensions": "query,page",
  "rowLimit": 5000
}
```

**Example - Regex Filter (enhanced_search_analytics):**

```json
{
  "siteUrl": "https://example.com",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "dimensions": "page,query",
  "regexFilter": "(AI|machine learning|ML)",
  "deviceFilter": "MOBILE",
  "rowLimit": 10000
}
```

**Example - Quick Wins (detect_quick_wins):**

```json
{
  "siteUrl": "https://example.com",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "minImpressions": 500,
  "maxCtr": 2,
  "positionRangeMin": 4,
  "positionRangeMax": 15
}
```

## License

MIT

## Contributing

Contributions are welcome. See `CLAUDE.md` for the install, type-check and test commands.
