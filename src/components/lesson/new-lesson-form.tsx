"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createChargedSphereMockLesson } from "@/lib/mock/chargedSphereLesson";
import { saveLesson } from "@/lib/storage/lessonRepository";

export function NewLessonForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadExampleLesson() {
    setLoading(true);
    setError(null);
    try {
      const lesson = await saveLesson(createChargedSphereMockLesson());
      router.push(`/lessons/${lesson.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lesson.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">New lesson</h1>
        <p className="text-sm text-muted-foreground">
          Paste an explanation or upload a screenshot of educational
          material. The AI pipeline that turns this into an interactive
          visual lesson lands in Milestone 3.
        </p>
      </div>

      <textarea
        disabled
        placeholder="Paste a text explanation here..."
        rows={8}
        className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
      />

      <div className="flex items-center gap-3">
        <Button disabled>Generate lesson</Button>
        <Button disabled variant="outline">
          Upload screenshot
        </Button>
      </div>

      <div className="rounded-md border border-dashed border-border p-4">
        <p className="text-sm font-medium">Try the local library now</p>
        <p className="mt-1 text-xs text-muted-foreground">
          AI generation isn&apos;t wired up yet, but you can load a
          hand-written example lesson to try saving, reopening and
          exporting a lesson.
        </p>
        <Button className="mt-3" onClick={loadExampleLesson} disabled={loading}>
          {loading ? "Loading..." : "Load example lesson"}
        </Button>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
