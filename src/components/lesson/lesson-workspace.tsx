"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Equation } from "@/components/equations/equation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { VisualBlockRenderer } from "@/components/visuals/visual-block-renderer";
import type { VisualLesson } from "@/lib/schema/lesson";

import { CuriosityQuestions } from "./curiosity-questions";
import { LessonVerificationPanel } from "./lesson-verification-panel";
import { exportLesson } from "@/lib/storage/exportImport";
import { deleteLesson, saveLesson } from "@/lib/storage/lessonRepository";
import { canRedo, canUndo, redo, undo } from "@/lib/storage/revisionRepository";

function download(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function LessonWorkspace({
  lesson,
  onLessonChanged,
}: {
  lesson: VisualLesson;
  onLessonChanged: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [redoAvailable, setRedoAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([canUndo(lesson.id), canRedo(lesson.id)]).then(([u, r]) => {
      if (!cancelled) {
        setUndoAvailable(u);
        setRedoAvailable(r);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [lesson]);

  async function handleDelete() {
    setDeleting(true);
    await deleteLesson(lesson.id);
    router.push("/library");
  }

  function handleExport() {
    download(`${lesson.id}.json`, exportLesson(lesson));
  }

  async function handleUndo() {
    const restored = await undo(lesson.id);
    if (restored) {
      await saveLesson(restored);
      onLessonChanged();
    }
  }

  async function handleRedo() {
    const restored = await redo(lesson.id);
    if (restored) {
      await saveLesson(restored);
      onLessonChanged();
    }
  }

  async function handleRetryGeneratedIllustration(sectionId: string, visualId: string) {
    const updatedLesson: VisualLesson = {
      ...lesson,
      updatedAt: new Date().toISOString(),
      sections: lesson.sections.map((section) => {
        if (section.id !== sectionId) return section;

        return {
          ...section,
          visuals: section.visuals.map((visual) => {
            if (visual.id !== visualId) return visual;
            const parameters = { ...visual.parameters };
            delete parameters.imageDataUrl;
            delete parameters.mimeType;

            return {
              ...visual,
              parameters,
              generationStatus: "pending" as const,
              error: undefined,
            };
          }),
        };
      }),
    };

    await saveLesson(updatedLesson);
    onLessonChanged();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {lesson.title}
          </h1>
          <p className="text-sm text-muted-foreground">{lesson.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={!undoAvailable}
          >
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={!redoAvailable}
          >
            Redo
          </Button>
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

      {lesson.source.kind === "screenshot" &&
        lesson.source.originalImages &&
        lesson.source.originalImages.length > 0 && (
          <details className="rounded-md border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Original screenshot{lesson.source.originalImages.length > 1 ? "s" : ""}
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              {lesson.source.originalImages.map((image, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={index}
                  src={image}
                  alt={`Original uploaded screenshot ${index + 1}`}
                  className="max-h-96 rounded-md border border-border object-contain"
                />
              ))}
            </div>
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
                  <div
                    key={equation.id}
                    className="flex flex-col gap-1 rounded-md bg-muted px-3 py-2"
                  >
                    <Equation latex={equation.latex} display />
                    {equation.appliesWhen && (
                      <span className="text-xs text-foreground/70">
                        when {equation.appliesWhen}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {section.visuals.length > 0 && (
              <div className="flex flex-col gap-4">
                {section.visuals.map((visual) => (
                  <VisualBlockRenderer
                    key={visual.id}
                    block={visual}
                    onRetryGeneratedIllustration={
                      visual.templateId === "generated-illustration" &&
                      visual.generationStatus === "error"
                        ? () => handleRetryGeneratedIllustration(section.id, visual.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
            <CuriosityQuestions questions={section.curiosityQuestions} />
            <Separator className="mt-2" />
          </section>
        ))}
      </div>

      <LessonVerificationPanel lesson={lesson} />
    </div>
  );
}
