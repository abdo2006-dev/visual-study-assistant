"use client";

import Image from "next/image";

import type { GeneratedIllustrationParams } from "@/lib/schema/templates/generatedIllustration";

export function GeneratedIllustration({
  parameters,
}: {
  parameters: GeneratedIllustrationParams;
}) {
  if (!parameters.imageDataUrl) {
    return (
      <div
        className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground"
        role="img"
        aria-label="Generated illustration is being created."
      >
        Generating a custom illustration...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/20 p-3">
      <Image
        src={parameters.imageDataUrl}
        alt={parameters.caption ?? "Generated instructional illustration"}
        width={1280}
        height={720}
        unoptimized
        className="aspect-video w-full rounded-sm object-contain"
      />
      {parameters.caption && (
        <p className="text-xs text-muted-foreground">
          {parameters.caption}
        </p>
      )}
    </div>
  );
}
