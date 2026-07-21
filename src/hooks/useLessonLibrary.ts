"use client";

import { useCallback, useEffect, useState } from "react";

import type { VisualLesson } from "@/lib/schema/lesson";
import { deleteLesson, listLessons } from "@/lib/storage/lessonRepository";

export function useLessonLibrary() {
  const [lessons, setLessons] = useState<VisualLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setLessons(await listLessons());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lessons.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Loads from IndexedDB (an external system) on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const remove = useCallback(
    async (id: string) => {
      await deleteLesson(id);
      await refresh();
    },
    [refresh]
  );

  return { lessons, loading, error, refresh, remove };
}
