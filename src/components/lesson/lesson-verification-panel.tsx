"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { condenseLessonForVerification } from "@/lib/lessonPatch/condenseLessonForVerification";
import type { VisualLesson } from "@/lib/schema/lesson";
import { type LessonVerification, lessonVerificationSchema } from "@/lib/schema/verification";

export function LessonVerificationPanel({ lesson }: { lesson: VisualLesson }) {
  const [result, setResult] = useState<LessonVerification | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    setChecking(true);
    setError(null);
    try {
      const response = await fetch("/api/verify-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson: condenseLessonForVerification(lesson) }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to check this lesson.");
      }
      setResult(lessonVerificationSchema.parse(body));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check this lesson.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="rounded-md border border-dashed border-border p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Check for issues</p>
          <p className="text-xs text-muted-foreground">
            Asks the AI to compare each section&apos;s text, equations, and
            visuals for inconsistencies. Advisory only — not proof of
            correctness.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleCheck} disabled={checking}>
          {checking ? "Checking..." : "Run check"}
        </Button>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      {result && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-sm">{result.summary}</p>
          {result.issues.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No inconsistencies found — this is not a guarantee the lesson is correct.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {result.issues.map((issue, i) => (
                <li key={i} className="rounded-md bg-muted px-3 py-2 text-xs">
                  <span className="font-medium capitalize">
                    {issue.category.replace(/-/g, " ")}:{" "}
                  </span>
                  {issue.description}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
