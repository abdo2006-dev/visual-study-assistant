import "server-only";

import { mapAiErrorToResponse } from "@/lib/ai/routeErrorResponse";
import { withUsageTracking } from "@/lib/ai/usageContext";

const encoder = new TextEncoder();

/**
 * Runs `fn` and streams the outcome to the client as newline-delimited
 * JSON, so a slow (often 10-20s) AI call can narrate what phase it's in
 * instead of leaving the UI looking stuck. Each line is one of:
 *   { type: "progress", message: string }   — zero or more
 *   { type: "result", ...data, apiUsage }   — exactly one, on success
 *   { type: "error", status, error }        — exactly one, on failure
 *
 * Error status/message come from the same `mapAiErrorToResponse` every
 * non-streaming route uses, so error semantics stay in one place even
 * though they now travel in the body instead of the HTTP status (the
 * initial response is always a 200 — we don't know if it'll fail until
 * partway through).
 */
export function streamWithProgress<T extends object>(
  fn: (onProgress: (message: string) => void) => Promise<T>,
  options: { timedOut: () => boolean; logPrefix: string; onSettled?: () => void }
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const write = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
        } catch {
          // The client disconnected mid-stream — nothing more to do.
        }
      };

      try {
        const { result, usage } = await withUsageTracking(() =>
          fn((message) => write({ type: "progress", message }))
        );
        write({ type: "result", ...result, apiUsage: usage });
      } catch (err) {
        const errorResponse = mapAiErrorToResponse(err, {
          timedOut: options.timedOut(),
          logPrefix: options.logPrefix,
        });
        const body = (await errorResponse.json()) as { error: string };
        write({ type: "error", status: errorResponse.status, error: body.error });
      } finally {
        options.onSettled?.();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
