import { AppShell } from "@/components/layout/app-shell";

export default function ImportExportPage() {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-2 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">
          Import / export
        </h1>
        <p className="text-sm text-muted-foreground">
          Export or import a lesson, or your whole local library, as a
          portable JSON package (Milestone 2).
        </p>
      </div>
    </AppShell>
  );
}
