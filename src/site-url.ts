// Pure site-URL handling for the permission fallback.
// Must not import googleapis (keeps it unit-testable).

const ACCEPTED_FORMS =
  'Use "sc-domain:example.com" for a domain property or "https://www.example.com/" for a URL-prefix property.';

const MAX_ECHO = 100;

/**
 * Shorten user input before it goes into an error message.
 * Cuts on a code-point boundary so a surrogate pair is never split.
 */
export function truncateForError(value: string, max: number = MAX_ECHO): string {
  if (value.length <= max) return value;
  const points = Array.from(value);
  if (points.length <= max) return value;
  return `${points.slice(0, max).join('')}... (${points.length} characters)`;
}

/**
 * Alternative property names to try when a query is refused for permission.
 * - sc-domain: input is never rewritten and has no candidates.
 * - http(s) URL-prefix input falls back to the domain property for its hostname.
 * - anything else (bare host, empty, missing) throws a clear Error.
 */
export function fallbackSiteUrls(url: string | null | undefined): string[] {
  if (typeof url !== 'string' || url.trim() === '') {
    throw new Error(`siteUrl is required. ${ACCEPTED_FORMS}`);
  }
  if (url.startsWith('sc-domain:')) {
    return [];
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`Invalid siteUrl "${truncateForError(url)}". ${ACCEPTED_FORMS}`);
  }
  if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
    return [`sc-domain:${parsedUrl.hostname}`];
  }
  throw new Error(`Invalid siteUrl "${truncateForError(url)}". ${ACCEPTED_FORMS}`);
}
