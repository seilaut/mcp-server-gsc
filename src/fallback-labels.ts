// Pure helpers that say which property a fallback answer or failure belongs to.
// Must not import googleapis (keeps it unit-testable).
import { truncateForError } from './site-url.js';

/**
 * An error thrown by the permission fallback. `cause` is the original permission
 * error from Google; `fallbackCause` is whatever cause the fallback's own error
 * carried before `cause` was overwritten (gaxios sets one).
 */
export interface PermissionFallbackError extends Error {
  cause?: unknown;
  fallbackCause?: unknown;
  requestedSiteUrl?: string;
  answeredSiteUrl?: string;
}

/** The label fields of a fallback answer; empty when the requested property answered. */
export function pickFallbackFields(data: unknown) {
  const d = (data ?? {}) as Record<string, unknown>;
  return d.answeredSiteUrl === undefined
    ? {}
    : { requestedSiteUrl: d.requestedSiteUrl, answeredSiteUrl: d.answeredSiteUrl, note: d.note };
}

/**
 * When a failed fallback error reaches the caller, only its message is sent, and that
 * names the fallback property. Name the property the caller asked for too (capped:
 * it is caller input). Any other error is returned unchanged.
 */
export function nameRequestedProperty(error: unknown): unknown {
  if (!(error instanceof Error)) return error;
  const { requestedSiteUrl, answeredSiteUrl } = error as PermissionFallbackError;
  if (typeof requestedSiteUrl !== 'string') return error;
  const tried =
    typeof answeredSiteUrl === 'string' ? `; retried as ${truncateForError(answeredSiteUrl)}` : '';
  return new Error(
    `${error.message} (requested property: ${truncateForError(requestedSiteUrl)}${tried})`,
    { cause: error },
  );
}
