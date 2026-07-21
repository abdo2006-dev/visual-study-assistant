"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useLessonLibrary } from "@/hooks/useLessonLibrary";

export function LibraryList() {
  const { lessons, loading, error, remove } = useLessonLibrary();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setPendingDeleteId(id);
    await remove(id);
    setPendingDeleteId(null);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading lessons...</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (lessons.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No saved lessons yet. Go to{" "}
        <Link href="/" className="underline underline-offset-2">
          New lesson
        </Link>{" "}
        to create one.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
      {lessons.map((lesson) => (
        <li
          key={lesson.id}
          className="flex items-center justify-between gap-4 px-4 py-3"
        >
          <Link
            href={`/lessons/${lesson.id}`}
            className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
          >
            {lesson.title}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(lesson.id)}
            disabled={pendingDeleteId === lesson.id}
          >
            {pendingDeleteId === lesson.id ? "Deleting..." : "Delete"}
          </Button>
        </li>
      ))}
    </ul>
  );
}
