/**
 * Guard rails: this lab only talks to servers you run or are authorized to test.
 * Requests to Kahoot-owned infrastructure are refused on purpose — this project does
 * not implement (and must not be used against) Kahoot's private API.
 */
export const BLOCKED_HOST_SUFFIXES = ["kahoot.it", "kahoot.com", "kahoot.net"] as const;

export function isBlockedHost(url: string, base?: string): boolean {
  let host: string;
  try {
    host = new URL(url, base ?? "http://localhost").hostname.toLowerCase();
  } catch {
    return false;
  }
  return BLOCKED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

export class BlockedHostError extends Error {
  constructor(url: string) {
    super(
      `Refusing to connect to "${url}": this lab only works with the local Mock Server or an API you are authorized to use.`,
    );
    this.name = "BlockedHostError";
  }
}

export function assertAllowedUrl(url: string, base?: string): void {
  if (isBlockedHost(url, base)) throw new BlockedHostError(url);
}
