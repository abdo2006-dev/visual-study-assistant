"use client";

import Link from "next/link";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useLessonLibrary } from "@/hooks/useLessonLibrary";

import { NavLinks } from "./nav-links";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { lessons, loading } = useLessonLibrary();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-4">
        <span className="text-sm font-semibold tracking-tight">
          Visual Study Assistant
        </span>
      </div>
      <Separator />
      <div className="p-3">
        <NavLinks onNavigate={onNavigate} />
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-3 py-3">
        {loading ? (
          <p className="px-1 text-xs text-sidebar-foreground/80">
            Loading lessons...
          </p>
        ) : lessons.length === 0 ? (
          <p className="px-1 text-xs text-sidebar-foreground/80">
            Saved lessons will appear here.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={`/lessons/${lesson.id}`}
                  onClick={onNavigate}
                  className="block truncate rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  {lesson.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
