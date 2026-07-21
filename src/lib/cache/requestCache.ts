import "server-only";

/**
 * Process-lifetime, in-memory cache keyed by content hash, so retrying the
 * same paste (or a page refresh mid-review) doesn't spend another AI call.
 * Not persisted — fine for a local single-user app; a page reload after the
 * process restarts simply misses once.
 */
const cache = new Map<string, { value: unknown; expiresAt: number }>();

export async function hashContent(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function withCache<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const value = await compute();
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}
