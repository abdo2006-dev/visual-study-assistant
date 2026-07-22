"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useElapsedSeconds } from "@/hooks/useElapsedSeconds";
import { readProgressStream } from "@/lib/ai/readProgressStream";
import { visualLessonSchema } from "@/lib/schema/lesson";
import { recordApiUsageFromResponseBody } from "@/lib/storage/apiUsageRepository";
import {
  createBatch,
  getRecentBatches,
  markStaleBatchesInterrupted,
  updateBatchLessons,
} from "@/lib/storage/bulkImportBatchRepository";
import type { BulkImportBatch, BulkImportLessonStatus } from "@/lib/storage/db";
import { saveLesson } from "@/lib/storage/lessonRepository";

interface ProposedLesson {
  title: string;
  topic?: string;
  sourceText: string;
  included: boolean;
}

interface GenerationResult {
  title: string;
  status: BulkImportLessonStatus;
  lessonId?: string;
  error?: string;
  /** Live phase text while status === "generating" (e.g. "Choosing visuals..."). */
  statusMessage?: string;
}

type Step = "input" | "review" | "generating" | "done";

const STATUS_LABEL: Record<BulkImportLessonStatus, string> = {
  pending: "Waiting...",
  generating: "Generating...",
  success: "Done",
  error: "Failed",
  cancelled: "Cancelled",
  interrupted: "Interrupted (tab closed before it finished)",
};

export function BulkImportPanel() {
  const [step, setStep] = useState<Step>("input");
  const [sourceText, setSourceText] = useState("");
  const [proposed, setProposed] = useState<ProposedLesson[]>([]);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [recentBatches, setRecentBatches] = useState<BulkImportBatch[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);
  const batchIdRef = useRef<string | null>(null);
  const elapsedSeconds = useElapsedSeconds(step === "generating");

  useEffect(() => {
    markStaleBatchesInterrupted()
      .then(() => getRecentBatches())
      .then(setRecentBatches)
      .catch(() => {
        // Best-effort history — never block the rest of the page on it.
      });
  }, []);

  async function refreshRecentBatches() {
    try {
      setRecentBatches(await getRecentBatches());
    } catch {
      // Ignore — history is a convenience, not load-bearing.
    }
  }

  async function handleFileChosen(file: File) {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".txt") && file.type !== "text/plain") {
      setError("Please choose a .txt file.");
      return;
    }
    try {
      const text = await file.text();
      setSourceText(text);
    } catch {
      setError("Could not read that file.");
    }
  }

  async function handlePropose() {
    if (!sourceText.trim()) {
      setError("Paste or upload some text first.");
      return;
    }
    setPlanning(true);
    setError(null);
    try {
      const response = await fetch("/api/bulk-import-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to split this text into lessons.");
      }
      recordApiUsageFromResponseBody("bulk-import-plan", body);

      const lessons: ProposedLesson[] = (body.lessons ?? []).map(
        (lesson: { title: string; topic?: string; sourceText: string }) => ({
          ...lesson,
          included: true,
        })
      );
      setProposed(lessons);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to split this text into lessons.");
    } finally {
      setPlanning(false);
    }
  }

  function updateProposed(index: number, patch: Partial<ProposedLesson>) {
    setProposed((current) =>
      current.map((lesson, i) => (i === index ? { ...lesson, ...patch } : lesson))
    );
  }

  function handleCancelGeneration() {
    cancelledRef.current = true;
  }

  function toBatchLessons(current: GenerationResult[]) {
    return current.map(({ title, status, lessonId, error: lessonError }) => ({
      title,
      status,
      lessonId,
      error: lessonError,
    }));
  }

  async function handleGenerate() {
    const toGenerate = proposed.filter((lesson) => lesson.included);
    if (toGenerate.length === 0) {
      setError("Select at least one lesson to generate.");
      return;
    }

    cancelledRef.current = false;
    setError(null);
    const initialResults: GenerationResult[] = toGenerate.map((lesson) => ({
      title: lesson.title,
      status: "pending",
    }));
    setResults(initialResults);
    setStep("generating");

    const batch = await createBatch(toBatchLessons(initialResults));
    batchIdRef.current = batch.id;
    void refreshRecentBatches();

    for (let i = 0; i < toGenerate.length; i++) {
      if (cancelledRef.current) {
        setResults((current) => {
          const next = current.map((result, index) =>
            index >= i && result.status === "pending"
              ? { ...result, status: "cancelled" as const }
              : result
          );
          if (batchIdRef.current) void updateBatchLessons(batchIdRef.current, toBatchLessons(next));
          return next;
        });
        break;
      }

      setResults((current) => {
        const next = current.map((result, index) =>
          index === i ? { ...result, status: "generating" as const, statusMessage: "Sending your text..." } : result
        );
        if (batchIdRef.current) void updateBatchLessons(batchIdRef.current, toBatchLessons(next));
        return next;
      });

      const proposedLesson = toGenerate[i];
      try {
        const response = await fetch("/api/lesson-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceText: proposedLesson.sourceText }),
        });
        if (!response.ok) {
          const fallback = await response.json().catch(() => null);
          throw new Error(fallback?.error ?? "Failed to generate this lesson.");
        }

        const body = await readProgressStream<{ apiUsage?: unknown }>(response, (message) => {
          setResults((current) =>
            current.map((result, index) => (index === i ? { ...result, statusMessage: message } : result))
          );
        });
        recordApiUsageFromResponseBody("lesson-plan", body);

        const lesson = visualLessonSchema.parse(body);
        lesson.title = proposedLesson.title;
        const saved = await saveLesson(lesson);

        setResults((current) => {
          const next = current.map((result, index) =>
            index === i ? { ...result, status: "success" as const, lessonId: saved.id } : result
          );
          if (batchIdRef.current) void updateBatchLessons(batchIdRef.current, toBatchLessons(next));
          return next;
        });
      } catch (err) {
        setResults((current) => {
          const next = current.map((result, index) =>
            index === i
              ? {
                  ...result,
                  status: "error" as const,
                  error: err instanceof Error ? err.message : "Failed to generate this lesson.",
                }
              : result
          );
          if (batchIdRef.current) void updateBatchLessons(batchIdRef.current, toBatchLessons(next));
          return next;
        });
      }
    }

    setStep("done");
    void refreshRecentBatches();
  }

  function handleStartOver() {
    setStep("input");
    setSourceText("");
    setProposed([]);
    setResults([]);
    setError(null);
    batchIdRef.current = null;
  }

  const includedCount = proposed.filter((lesson) => lesson.included).length;

  return (
    <div className="flex flex-col gap-4">
      {step === "input" && (
        <div className="flex flex-col gap-3">
          <textarea
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            placeholder="Paste a large block of study material here — several topics' worth is fine..."
            rows={12}
            className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground"
          />
          <div className="flex items-center gap-3">
            <Button onClick={handlePropose} disabled={planning}>
              {planning ? "Reading through it..." : "Propose lessons"}
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={planning}
            >
              Upload a .txt file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleFileChosen(file);
                event.target.value = "";
              }}
            />
          </div>

          {recentBatches.length > 0 && (
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
              <p className="text-sm font-medium">Recent imports</p>
              <ul className="flex flex-col gap-2">
                {recentBatches.map((recentBatch) => {
                  const successCount = recentBatch.lessons.filter((l) => l.status === "success").length;
                  return (
                    <li key={recentBatch.id} className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">
                        {new Date(recentBatch.updatedAt).toLocaleString()} —{" "}
                        {successCount} of {recentBatch.lessons.length} generated
                      </p>
                      <ul className="mt-1 flex flex-col gap-0.5">
                        {recentBatch.lessons.map((lesson, i) => (
                          <li key={i} className="flex items-center justify-between gap-3 text-sm">
                            <span className="truncate">{lesson.title}</span>
                            {lesson.status === "success" && lesson.lessonId ? (
                              <Link
                                href={`/lessons/${lesson.lessonId}`}
                                className="shrink-0 text-xs font-medium text-primary underline underline-offset-2"
                              >
                                View
                              </Link>
                            ) : (
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {STATUS_LABEL[lesson.status]}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {step === "review" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Proposed {proposed.length} lesson{proposed.length === 1 ? "" : "s"}
            {" "}from your text. Uncheck any you don&apos;t want, rename them
            if you&apos;d like, and generate.
          </p>
          <ul className="flex flex-col gap-3">
            {proposed.map((lesson, index) => (
              <li key={index} className="rounded-md border border-border p-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={lesson.included}
                    onChange={(event) => updateProposed(index, { included: event.target.checked })}
                    aria-label={`Include "${lesson.title}"`}
                    className="mt-1"
                  />
                  <div className="flex flex-1 flex-col gap-1">
                    <label className="sr-only" htmlFor={`title-${index}`}>
                      Lesson title
                    </label>
                    <input
                      id={`title-${index}`}
                      value={lesson.title}
                      onChange={(event) => updateProposed(index, { title: event.target.value })}
                      className="rounded-md border border-input bg-transparent px-2 py-1 text-sm font-medium"
                    />
                    {lesson.topic && (
                      <p className="text-xs text-muted-foreground">{lesson.topic}</p>
                    )}
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer">
                        Preview excerpt ({lesson.sourceText.length.toLocaleString()} characters)
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap">{lesson.sourceText}</p>
                    </details>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <Button onClick={handleGenerate} disabled={includedCount === 0}>
              Generate {includedCount} lesson{includedCount === 1 ? "" : "s"}
            </Button>
            <Button variant="outline" onClick={handleStartOver}>
              Start over
            </Button>
          </div>
        </div>
      )}

      {(step === "generating" || step === "done") && (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            {step === "generating" && (
              <span className="inline-block size-1.5 shrink-0 animate-pulse rounded-full bg-primary" aria-hidden="true" />
            )}
            {step === "generating"
              ? `Generating ${results.filter((r) => r.status === "success" || r.status === "error").length + 1} of ${results.length}... (${elapsedSeconds}s)`
              : `Generated ${results.filter((r) => r.status === "success").length} of ${results.length} lesson${results.length === 1 ? "" : "s"}.`}
          </p>
          <ul className="flex flex-col gap-2">
            {results.map((result, index) => (
              <li
                key={index}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="truncate">{result.title}</span>
                {result.status === "success" && result.lessonId && (
                  <Link
                    href={`/lessons/${result.lessonId}`}
                    className="shrink-0 font-medium text-primary underline underline-offset-2"
                  >
                    View
                  </Link>
                )}
                {result.status === "generating" && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {result.statusMessage ?? "Generating..."}
                  </span>
                )}
                {result.status === "pending" && (
                  <span className="shrink-0 text-xs text-muted-foreground">Waiting...</span>
                )}
                {result.status === "cancelled" && (
                  <span className="shrink-0 text-xs text-muted-foreground">Cancelled</span>
                )}
                {result.status === "error" && (
                  <span className="shrink-0 text-xs text-destructive">{result.error}</span>
                )}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            {step === "generating" ? (
              <Button variant="outline" onClick={handleCancelGeneration}>
                Cancel remaining
              </Button>
            ) : (
              <>
                <Button render={<Link href="/library" />}>Go to library</Button>
                <Button variant="outline" onClick={handleStartOver}>
                  Import more
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
