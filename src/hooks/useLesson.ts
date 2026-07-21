"use client";

import { useCallback, useEffect, useState } from "react";

import type { VisualLesson } from "@/lib/schema/lesson";
import { getLesson } from "@/lib/storage/lessonRepository";

export function useLesson(id: string) {
  const [lesson, setLesson] = useState<VisualLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getLesson(id);
      setLesson(result ?? null);
      setError(result ? null : "Lesson not found.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lesson.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    // Resets loading when `id` changes; IndexedDB is an external system
    // being synchronized into state, which is exactly what effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getLesson(id)
      .then((result) => {
        if (cancelled) return;
        setLesson(result ?? null);
        setError(result ? null : "Lesson not found.");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load lesson.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { lesson, loading, error, refresh };
}
