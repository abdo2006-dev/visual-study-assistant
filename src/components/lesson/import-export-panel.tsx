"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useLessonLibrary } from "@/hooks/useLessonLibrary";
import { exportLibrary, importPackage } from "@/lib/storage/exportImport";
import { saveLesson } from "@/lib/storage/lessonRepository";

function download(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ImportExportPanel() {
  const { lessons, refresh } = useLessonLibrary();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<
    { kind: "success" | "error"; message: string } | null
  >(null);

  function handleExportLibrary() {
    download(
      `visual-study-assistant-library-${Date.now()}.json`,
      exportLibrary(lessons)
    );
  }

  async function handleImportFile(file: File) {
    setStatus(null);
    try {
      const text = await file.text();
      const imported = importPackage(text);
      for (const lesson of imported) {
        await saveLesson(lesson);
      }
      await refresh();
      setStatus({
        kind: "success",
        message: `Imported ${imported.length} lesson${imported.length === 1 ? "" : "s"}.`,
      });
    } catch (err) {
      setStatus({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Failed to import the file.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-md border border-border p-4">
        <h2 className="text-sm font-semibold">Export your library</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Download all {lessons.length} saved lesson
          {lessons.length === 1 ? "" : "s"} as a single JSON file.
        </p>
        <Button
          className="mt-3"
          onClick={handleExportLibrary}
          disabled={lessons.length === 0}
        >
          Export library
        </Button>
      </div>

      <div className="rounded-md border border-border p-4">
        <h2 className="text-sm font-semibold">Import</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Import a single-lesson export or a whole-library export
          previously downloaded from this app.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleImportFile(file);
            event.target.value = "";
          }}
        />
        <Button
          className="mt-3"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose file to import
        </Button>
        {status && (
          <p
            className={`mt-2 text-xs ${status.kind === "error" ? "text-destructive" : "text-muted-foreground"}`}
          >
            {status.message}
          </p>
        )}
      </div>
    </div>
  );
}
