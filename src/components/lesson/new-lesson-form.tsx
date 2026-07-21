"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { createChargedSphereMockLesson } from "@/lib/mock/chargedSphereLesson";
import { visualLessonSchema } from "@/lib/schema/lesson";
import { recordApiUsageFromResponseBody } from "@/lib/storage/apiUsageRepository";
import { saveLesson } from "@/lib/storage/lessonRepository";

import { ScreenshotUploader } from "./screenshot-uploader";

export function NewLessonForm() {
  const router = useRouter();
  const [entryMode, setEntryMode] = useState<"text" | "upload">("text");
  const [sourceText, setSourceText] = useState("");
  const [screenshotDataUrls, setScreenshotDataUrls] = useState<string[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exampleLoading, setExampleLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  function handleSourceTextChange(value: string) {
    setSourceText(value);
    // A manual edit means the text is no longer purely what was extracted
    // from the screenshot(s), so stop tagging the eventual lesson as one.
    setScreenshotDataUrls(null);
  }

  function handleExtracted(markdown: string, imageDataUrls: string[]) {
    setSourceText(markdown);
    setScreenshotDataUrls(imageDataUrls);
    setEntryMode("text");
    setError(null);
  }

  async function handleGenerate() {
    if (!sourceText.trim()) {
      setError("Paste some text before generating a lesson.");
      return;
    }

    setGenerating(true);
    setError(null);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/lesson-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText }),
        signal: controller.signal,
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to generate the lesson.");
      }
      recordApiUsageFromResponseBody("lesson-plan", body);

      const lesson = visualLessonSchema.parse(body);
      if (screenshotDataUrls) {
        lesson.source = {
          kind: "screenshot",
          originalText: sourceText,
          originalImages: screenshotDataUrls,
        };
      }
      await saveLesson(lesson);
      router.push(`/lessons/${lesson.id}`);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Generation cancelled.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to generate the lesson.");
      }
    } finally {
      setGenerating(false);
      abortControllerRef.current = null;
    }
  }

  function handleCancel() {
    abortControllerRef.current?.abort();
  }

  async function loadExampleLesson() {
    setExampleLoading(true);
    setError(null);
    try {
      const lesson = await saveLesson(createChargedSphereMockLesson());
      router.push(`/lessons/${lesson.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lesson.");
      setExampleLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">New lesson</h1>
        <p className="text-sm text-muted-foreground">
          Paste an explanation, or upload one or more screenshots (e.g.
          consecutive pages) to extract their text. The AI turns it into
          sections with a simplified explanation, any equations it finds,
          and an interactive visual wherever one genuinely helps.
        </p>
      </div>

      {entryMode === "upload" ? (
        <div className="flex flex-col gap-3">
          <ScreenshotUploader onExtracted={handleExtracted} />
          <Button
            variant="ghost"
            className="self-start"
            onClick={() => setEntryMode("text")}
          >
            Back to pasting text
          </Button>
        </div>
      ) : (
        <>
          <textarea
            value={sourceText}
            onChange={(event) => handleSourceTextChange(event.target.value)}
            disabled={generating}
            placeholder="Paste a text explanation here..."
            rows={8}
            className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
          />
          {screenshotDataUrls && (
            <p className="text-xs text-muted-foreground">
              Text extracted from your screenshot{screenshotDataUrls.length > 1 ? "s" : ""} —
              edit it above before generating if needed.
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating..." : "Generate lesson"}
            </Button>
            {generating ? (
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setEntryMode("upload")}>
                Upload screenshot
              </Button>
            )}
          </div>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-md border border-dashed border-border p-4">
        <p className="text-sm font-medium">Try the local library</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Load a hand-written example lesson without calling the AI, to try
          saving, reopening and exporting a lesson.
        </p>
        <Button
          className="mt-3"
          variant="outline"
          onClick={loadExampleLesson}
          disabled={exampleLoading}
        >
          {exampleLoading ? "Loading..." : "Load example lesson"}
        </Button>
      </div>
    </div>
  );
}
