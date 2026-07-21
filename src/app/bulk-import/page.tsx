import { AppShell } from "@/components/layout/app-shell";
import { BulkImportPanel } from "@/components/lesson/bulk-import-panel";

export default function BulkImportPage() {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-12">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Bulk import</h1>
          <p className="text-sm text-muted-foreground">
            Paste (or upload) a large block of study material covering
            several topics — an AI pass proposes how to split it into
            separate lessons, verbatim from your text. Review the split,
            then each lesson generates independently through the normal
            pipeline, so quality doesn&apos;t drop just because you&apos;re
            importing more at once.
          </p>
        </div>
        <BulkImportPanel />
      </div>
    </AppShell>
  );
}
