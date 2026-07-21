"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { visualLessonSchema } from "@/lib/schema/lesson";
import { recordApiUsageFromResponseBody } from "@/lib/storage/apiUsageRepository";
import { saveLesson } from "@/lib/storage/lessonRepository";

interface ProposedLesson {
  title: string;
  topic?: string;
  sourceText: string;
  included: boolean;
}

type GenerationStatus = "pending" | "generating" | "success" | "error" | "cancelled";

interface GenerationResult {
  title: string;
  status: GenerationStatus;
  lessonId?: string;
  error?: string;
}

type Step = "input" | "review" | "generating" | "done";

export function BulkImportPanel() {
  const [step, setStep] = useState<Step>("input");
  const [sourceText, setSourceText] = useState("");
  const [proposed, setProposed] = useState<ProposedLesson[]>([]);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

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

  async function handleGenerate() {
    const toGenerate = proposed.filter((lesson) => lesson.included);
    if (toGenerate.length === 0) {
      setError("Select at least one lesson to generate.");
      return;
    }

    cancelledRef.current = false;
    setError(null);
    setResults(toGenerate.map((lesson) => ({ title: lesson.title, status: "pending" })));
    setStep("generating");

    for (let i = 0; i < toGenerate.length; i++) {
      if (cancelledRef.current) {
        setResults((current) =>
          current.map((result, index) =>
            index >= i && result.status === "pending"
              ? { ...result, status: "cancelled" }
              : result
          )
        );
        break;
      }

      setResults((current) =>
        current.map((result, index) => (index === i ? { ...result, status: "generating" } : result))
      );

      const proposedLesson = toGenerate[i];
      try {
        const response = await fetch("/api/lesson-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceText: proposedLesson.sourceText }),
        });
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error ?? "Failed to generate this lesson.");
        }
        recordApiUsageFromResponseBody("lesson-plan", body);

        const lesson = visualLessonSchema.parse(body);
        lesson.title = proposedLesson.title;
        const saved = await saveLesson(lesson);

        setResults((current) =>
          current.map((result, index) =>
            index === i ? { ...result, status: "success", lessonId: saved.id } : result
          )
        );
      } catch (err) {
        setResults((current) =>
          current.map((result, index) =>
            index === i
              ? {
                  ...result,
                  status: "error",
                  error: err instanceof Error ? err.message : "Failed to generate this lesson.",
                }
              : result
          )
        );
      }
    }

    setStep("done");
  }

  function handleStartOver() {
    setStep("input");
    setSourceText("");
    setProposed([]);
    setResults([]);
    setError(null);
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
          <p className="text-sm font-medium">
            {step === "generating"
              ? `Generating ${results.filter((r) => r.status === "success" || r.status === "error").length + 1} of ${results.length}...`
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
                  <span className="shrink-0 text-xs text-muted-foreground">Generating...</span>
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
