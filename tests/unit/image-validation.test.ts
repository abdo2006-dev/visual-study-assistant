import { describe, expect, it } from "vitest";

import { MAX_UPLOAD_BYTES, validateImageFile } from "@/lib/upload/imageValidation";

function makeFile(type: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], "screenshot", { type });
}

describe("validateImageFile", () => {
  it("accepts PNG, JPEG, and WebP within the size limit", () => {
    expect(validateImageFile(makeFile("image/png", 1000))).toEqual({ valid: true });
    expect(validateImageFile(makeFile("image/jpeg", 1000))).toEqual({ valid: true });
    expect(validateImageFile(makeFile("image/webp", 1000))).toEqual({ valid: true });
  });

  it("rejects an unsupported file type", () => {
    const result = validateImageFile(makeFile("application/pdf", 1000));
    expect(result.valid).toBe(false);
  });

  it("rejects a file over the size limit", () => {
    const result = validateImageFile(makeFile("image/png", MAX_UPLOAD_BYTES + 1));
    expect(result.valid).toBe(false);
  });
});
