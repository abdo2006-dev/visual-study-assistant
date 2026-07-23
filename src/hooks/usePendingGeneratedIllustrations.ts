"use client";

import { useEffect, useRef } from "react";

import type { VisualLesson } from "@/lib/schema/lesson";
import type { VisualBlock } from "@/lib/schema/visualBlocks";
import { recordApiUsageFromResponseBody } from "@/lib/storage/apiUsageRepository";
import { getLesson, saveLesson } from "@/lib/storage/lessonRepository";

interface PendingGeneratedIllustration {
  sectionId: string;
  visualId: string;
  imagePrompt: string;
}

export function usePendingGeneratedIllustrations(
  lesson: VisualLesson | null,
  onLessonChanged: () => void
) {
  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!lesson) return;

    const pending = findPendingGeneratedIllustrations(lesson).filter(
      (item) => !inFlightRef.current.has(item.visualId)
    );
    if (pending.length === 0) return;

    const lessonId = lesson.id;
    let cancelled = false;

    async function runQueue() {
      for (const item of pending) {
        if (cancelled) return;
        inFlightRef.current.add(item.visualId);

        try {
          const response = await fetch("/api/generate-visual-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imagePrompt: item.imagePrompt }),
          });

          const body = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(body?.error ?? "Failed to generate that visual image.");
          }
          recordApiUsageFromResponseBody("generate-visual-image", body);

          await updateGeneratedIllustration(lessonId, item, (visual) => ({
            ...visual,
            generationStatus: "ready",
            error: undefined,
            parameters: {
              ...visual.parameters,
              imageDataUrl: body.dataUrl,
              mimeType: body.mimeType,
            },
          }));
        } catch (err) {
          await updateGeneratedIllustration(lessonId, item, (visual) => ({
            ...visual,
            generationStatus: "error",
            error:
              err instanceof Error
                ? err.message
                : "Failed to generate that visual image.",
          }));
        }

        if (!cancelled) onLessonChanged();
      }
    }

    void runQueue();

    return () => {
      cancelled = true;
    };
  }, [lesson, onLessonChanged]);
}

function findPendingGeneratedIllustrations(
  lesson: VisualLesson
): PendingGeneratedIllustration[] {
  return lesson.sections.flatMap((section) =>
    section.visuals.flatMap((visual) => {
      if (visual.templateId !== "generated-illustration") return [];
      if (typeof visual.parameters.imageDataUrl === "string") return [];
      if (visual.generationStatus === "error") return [];

      const imagePrompt = visual.parameters.imagePrompt;
      if (typeof imagePrompt !== "string" || imagePrompt.trim().length < 20) return [];

      return [
        {
          sectionId: section.id,
          visualId: visual.id,
          imagePrompt: imagePrompt.trim(),
        },
      ];
    })
  );
}

async function updateGeneratedIllustration(
  lessonId: string,
  item: PendingGeneratedIllustration,
  updateVisual: (visual: VisualBlock) => VisualBlock
) {
  const latestLesson = await getLesson(lessonId);
  if (!latestLesson) return;

  const nextLesson: VisualLesson = {
    ...latestLesson,
    updatedAt: new Date().toISOString(),
    sections: latestLesson.sections.map((section) => {
      if (section.id !== item.sectionId) return section;
      return {
        ...section,
        visuals: section.visuals.map((visual) =>
          visual.id === item.visualId ? updateVisual(visual) : visual
        ),
      };
    }),
  };

  await saveLesson(nextLesson);
}
