import "server-only";

export class RateLimitError extends Error {
  constructor() {
    super("Too many AI requests. Please wait a moment and try again.");
    this.name = "RateLimitError";
  }
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

/**
 * Single-process fixed-window limiter. There's no multi-user traffic to
 * defend against here — this exists to catch a runaway client (e.g. a retry
 * loop bug) from burning through Gemini quota, per-process is enough.
 */
let windowStart = Date.now();
let requestsInWindow = 0;

export function checkRateLimit(): void {
  const now = Date.now();
  if (now - windowStart >= WINDOW_MS) {
    windowStart = now;
    requestsInWindow = 0;
  }

  requestsInWindow += 1;
  if (requestsInWindow > MAX_REQUESTS_PER_WINDOW) {
    throw new RateLimitError();
  }
}
