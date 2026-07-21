"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { compressImage, dataUrlToBase64 } from "@/lib/upload/compressImage";
import { validateImageFile } from "@/lib/upload/imageValidation";

type PreviewState = {
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  fileName: string;
};

export function ScreenshotUploader({
  onExtracted,
}: {
  onExtracted: (markdown: string, imageDataUrl: string) => void;
}) {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const item = Array.from(event.clipboardData?.items ?? []).find((entry) =>
        entry.type.startsWith("image/")
      );
      const file = item?.getAsFile();
      if (file) {
        event.preventDefault();
        handleFile(file);
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  async function handleFile(file: File) {
    setError(null);
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setProcessing(true);
    try {
      const compressed = await compressImage(file);
      setPreview({
        dataUrl: compressed.dataUrl,
        mimeType: compressed.mimeType,
        width: compressed.width,
        height: compressed.height,
        fileName: file.name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process that image.");
    } finally {
      setProcessing(false);
    }
  }

  function handleRemove() {
    setPreview(null);
    setError(null);
  }

  async function handleExtract() {
    if (!preview) return;
    setExtracting(true);
    setError(null);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: dataUrlToBase64(preview.dataUrl),
          mimeType: preview.mimeType,
        }),
        signal: controller.signal,
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to extract text from the image.");
      }

      onExtracted(body.markdown, preview.dataUrl);
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

  if (preview) {
    return (
      <div className="flex flex-col gap-3 rounded-md border border-border p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview.dataUrl}
          alt="Uploaded screenshot preview"
          className="max-h-64 w-full rounded-md border border-border object-contain"
        />
        <p className="text-xs text-muted-foreground">
          {preview.fileName} — {preview.width}×{preview.height}
        </p>
        <div className="flex items-center gap-3">
          <Button onClick={handleExtract} disabled={extracting}>
            {extracting ? "Extracting text..." : "Extract text"}
          </Button>
          {extracting ? (
            <Button variant="outline" onClick={handleCancelExtract}>
              Cancel
            </Button>
          ) : (
            <Button variant="outline" onClick={handleRemove} disabled={extracting}>
              Remove
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        const file = event.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      className={`flex flex-col items-center gap-3 rounded-md border border-dashed p-8 text-center transition-colors ${
        dragActive ? "border-primary bg-accent" : "border-border"
      }`}
    >
      <p className="text-sm font-medium">
        Drag and drop a screenshot, paste one, or choose a file
      </p>
      <p className="text-xs text-muted-foreground">PNG, JPEG, or WebP</p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
          event.target.value = "";
        }}
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={processing}
      >
        {processing ? "Processing..." : "Choose file"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
