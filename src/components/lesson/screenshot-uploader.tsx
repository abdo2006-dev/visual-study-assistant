"use client";

import { type DragEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { getEconomyModeOverride } from "@/lib/settings/economyModePreference";
import { recordApiUsageFromResponseBody } from "@/lib/storage/apiUsageRepository";
import { compressImage, dataUrlToBase64 } from "@/lib/upload/compressImage";
import { validateImageFile } from "@/lib/upload/imageValidation";

type PreviewState = {
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  fileName: string;
};

const MAX_IMAGES = 6;

export function ScreenshotUploader({
  onExtracted,
}: {
  onExtracted: (markdown: string, imageDataUrls: string[]) => void;
}) {
  const [previews, setPreviews] = useState<PreviewState[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const items = Array.from(event.clipboardData?.items ?? []).filter((entry) =>
        entry.type.startsWith("image/")
      );
      const files = items.map((item) => item.getAsFile()).filter((f): f is File => f !== null);
      if (files.length > 0) {
        event.preventDefault();
        handleFiles(files);
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
    // Re-registered whenever previews.length changes so handleFiles' cap
    // check always sees the current count, not a stale closure from mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previews.length]);

  async function handleFiles(files: File[]) {
    setError(null);

    const remainingSlots = MAX_IMAGES - previews.length;
    if (remainingSlots <= 0) {
      setError(`You can attach up to ${MAX_IMAGES} screenshots.`);
      return;
    }
    const toProcess = files.slice(0, remainingSlots);
    if (files.length > toProcess.length) {
      setError(`Only added the first ${toProcess.length} — up to ${MAX_IMAGES} screenshots total.`);
    }

    for (const file of toProcess) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setError(validation.error);
        return;
      }
    }

    setProcessing(true);
    try {
      const compressed = await Promise.all(toProcess.map((file) => compressImage(file)));
      setPreviews((current) => [
        ...current,
        ...compressed.map((result, i) => ({
          dataUrl: result.dataUrl,
          mimeType: result.mimeType,
          width: result.width,
          height: result.height,
          fileName: toProcess[i].name,
        })),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process that image.");
    } finally {
      setProcessing(false);
    }
  }

  function handleRemove(index: number) {
    setPreviews((current) => current.filter((_, i) => i !== index));
    setError(null);
  }

  function handleRemoveAll() {
    setPreviews([]);
    setError(null);
  }

  async function handleExtract() {
    if (previews.length === 0) return;
    setExtracting(true);
    setError(null);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: previews.map((preview) => ({
            imageBase64: dataUrlToBase64(preview.dataUrl),
            mimeType: preview.mimeType,
          })),
          mode: getEconomyModeOverride(),
        }),
        signal: controller.signal,
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to extract text from the image.");
      }
      recordApiUsageFromResponseBody("extract", body);

      onExtracted(
        body.markdown,
        previews.map((preview) => preview.dataUrl)
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Extraction cancelled.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to extract text from the image.");
      }
    } finally {
      setExtracting(false);
      abortControllerRef.current = null;
    }
  }

  function handleCancelExtract() {
    abortControllerRef.current?.abort();
  }

  const dropZoneProps = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      setDragActive(true);
    },
    onDragLeave: () => setDragActive(false),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setDragActive(false);
      const files = Array.from(event.dataTransfer.files ?? []);
      if (files.length > 0) handleFiles(files);
    },
  };

  if (previews.length > 0) {
    return (
      <div
        {...dropZoneProps}
        data-slot="screenshot-dropzone"
        className={`flex flex-col gap-3 rounded-md border p-4 transition-colors ${
          dragActive ? "border-primary bg-accent" : "border-border"
        }`}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {previews.map((preview, index) => (
            <div key={index} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.dataUrl}
                alt={`Uploaded screenshot preview ${index + 1}`}
                className="h-32 w-full rounded-md border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                disabled={extracting}
                aria-label={`Remove screenshot ${index + 1}`}
                className="absolute right-1 top-1 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground shadow-sm hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
              >
                Remove
              </button>
            </div>
          ))}
          {previews.length < MAX_IMAGES && !extracting && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={processing}
              className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border p-2 text-center text-sm text-muted-foreground hover:border-primary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? (
                "Processing..."
              ) : (
                <>
                  <span>+ Add another</span>
                  <span className="text-xs">or drag and drop, or paste</span>
                </>
              )}
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {previews.length} screenshot{previews.length === 1 ? "" : "s"}
          {previews.length > 1 ? " — extracted together, in this order" : ""}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) handleFiles(files);
            event.target.value = "";
          }}
        />
        <div className="flex items-center gap-3">
          <Button onClick={handleExtract} disabled={extracting || processing}>
            {extracting ? "Extracting text..." : "Extract text"}
          </Button>
          {extracting ? (
            <Button variant="outline" onClick={handleCancelExtract}>
              Cancel
            </Button>
          ) : (
            <Button variant="outline" onClick={handleRemoveAll} disabled={extracting}>
              Remove all
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div
      {...dropZoneProps}
      data-slot="screenshot-dropzone"
      className={`flex flex-col items-center gap-3 rounded-md border border-dashed p-8 text-center transition-colors ${
        dragActive ? "border-primary bg-accent" : "border-border"
      }`}
    >
      <p className="text-sm font-medium">
        Drag and drop screenshots, paste them, or choose files
      </p>
      <p className="text-xs text-muted-foreground">
        PNG, JPEG, or WebP — up to {MAX_IMAGES} at once, e.g. consecutive pages
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) handleFiles(files);
          event.target.value = "";
        }}
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={processing}
      >
        {processing ? "Processing..." : "Choose files"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
