import "server-only";

import { NextResponse } from "next/server";

import { withUsageTracking } from "@/lib/ai/usageContext";

/**
 * Runs an AI-route handler's work under usage tracking and attaches every
 * Gemini call made during it as `apiUsage` on the JSON response, so the
 * client can log real token/request counts without the server persisting
 * anything itself (this app has no server-side database — see
 * SECURITY.md). Errors propagate untouched for the route's own catch block
 * to map via mapAiErrorToResponse.
 */
export async function jsonWithUsage<T extends object>(
  fn: () => Promise<T>
): Promise<NextResponse> {
  const { result, usage } = await withUsageTracking(fn);
  return NextResponse.json({ ...result, apiUsage: usage }, { status: 200 });
}
