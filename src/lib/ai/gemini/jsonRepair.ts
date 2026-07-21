import type { z } from "zod";

export type StructuredParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Parses `text` as JSON and validates it against `schema`, without throwing. */
export function parseStructuredJson<T>(
  text: string,
  schema: z.ZodType<T>
): StructuredParseResult<T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return {
      success: false,
      error: `Response was not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return { success: false, error: result.error.message };
  }
  return { success: true, data: result.data };
}
