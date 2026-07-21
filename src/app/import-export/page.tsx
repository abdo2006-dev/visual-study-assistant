import { AppShell } from "@/components/layout/app-shell";
import { ImportExportPanel } from "@/components/lesson/import-export-panel";

export default function ImportExportPage() {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-12">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Import / export
          </h1>
          <p className="text-sm text-muted-foreground">
            Export your whole library as a portable JSON file, or export a
            single lesson from its workspace page. Import restores lessons
            from either kind of export.
          </p>
        </div>
        <ImportExportPanel />
      </div>
    </AppShell>
  );
}
