"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useLesson } from "@/hooks/useLesson";
import { usePendingGeneratedIllustrations } from "@/hooks/usePendingGeneratedIllustrations";

import { LessonChatPanel } from "./lesson-chat-panel";
import { LessonWorkspace } from "./lesson-workspace";

export function LessonPageClient({ id }: { id: string }) {
  const { lesson, loading, error, refresh } = useLesson(id);
  usePendingGeneratedIllustrations(lesson, refresh);

  return (
    <AppShell
      chatPanel={
        lesson ? (
          <LessonChatPanel lesson={lesson} onLessonChanged={refresh} />
        ) : undefined
      }
    >
      {loading && (
        <div className="mx-auto max-w-3xl px-6 py-12">
          <p className="text-sm text-muted-foreground">Loading lesson...</p>
        </div>
      )}
      {!loading && (error || !lesson) && (
        <div className="mx-auto max-w-3xl px-6 py-12">
          <p className="text-sm text-destructive">{error ?? "Lesson not found."}</p>
        </div>
      )}
      {!loading && lesson && (
        <LessonWorkspace lesson={lesson} onLessonChanged={refresh} />
      )}
    </AppShell>
  );
}
