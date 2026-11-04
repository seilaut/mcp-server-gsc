// Pure decision: is GOOGLE_APPLICATION_CREDENTIALS inline JSON or a key-file path?
// No googleapis import, no file read: GoogleAuth reads the key file lazily.
export type CredentialConfig =
  | { credentials: Record<string, unknown> }
  | { keyFile: string };

export function resolveCredentialConfig(credentials: string): CredentialConfig {
  if (credentials.trimStart().startsWith('{')) {
    try {
      return { credentials: JSON.parse(credentials) as Record<string, unknown> };
    } catch {
      // Fixed text on purpose: never include the parser message or the input.
      throw new Error('Invalid credentials: failed to parse JSON');
    }
  }
  return { keyFile: credentials };
}
