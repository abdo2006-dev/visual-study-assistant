"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLesson } from "@/hooks/useLesson";
import { exportLesson } from "@/lib/storage/exportImport";
import { deleteLesson } from "@/lib/storage/lessonRepository";

function download(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function LessonWorkspace({ id }: { id: string }) {
  const { lesson, loading, error } = useLesson(id);
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await deleteLesson(id);
    router.push("/library");
  }

  function handleExport() {
    if (!lesson) return;
    download(`${lesson.id}.json`, exportLesson(lesson));
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm text-muted-foreground">Loading lesson...</p>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm text-destructive">{error ?? "Lesson not found."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {lesson.title}
          </h1>
          <p className="text-sm text-muted-foreground">{lesson.summary}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete lesson"}
          </Button>
        </div>
      </div>

      {lesson.source.kind === "screenshot" && lesson.source.originalImage && (
        <details className="rounded-md border border-border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Original screenshot
          </summary>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lesson.source.originalImage}
            alt="Original uploaded screenshot"
            className="mt-3 max-h-96 rounded-md border border-border object-contain"
          />
        </details>
      )}

      {lesson.learningObjectives.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold">Learning objectives</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {lesson.learningObjectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-8">
        {lesson.sections.map((section) => (
          <section key={section.id} className="space-y-3">
            {section.heading && (
              <h2 className="text-lg font-semibold">{section.heading}</h2>
            )}
            <p className="text-sm leading-relaxed">
              {section.simplifiedExplanation}
            </p>
            {section.equations.length > 0 && (
              <div className="flex flex-col gap-2">
                {section.equations.map((equation) => (
                  <code
                    key={equation.id}
                    className="block rounded-md bg-muted px-3 py-2 text-xs"
                  >
                    {equation.latex}
                    {equation.appliesWhen ? ` (when ${equation.appliesWhen})` : ""}
                  </code>
                ))}
              </div>
            )}
            {section.visuals.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Interactive visuals for this section arrive in Milestone 5.
              </p>
            )}
            <Separator className="mt-2" />
          </section>
        ))}
      </div>
    </div>
  );
}
