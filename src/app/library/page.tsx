import { AppShell } from "@/components/layout/app-shell";

export default function LibraryPage() {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-2 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
        <p className="text-sm text-muted-foreground">
          Saved lessons will appear here once local storage is wired up
          (Milestone 2).
        </p>
      </div>
    </AppShell>
  );
}
