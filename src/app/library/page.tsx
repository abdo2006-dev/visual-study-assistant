import { AppShell } from "@/components/layout/app-shell";
import { LibraryList } from "@/components/lesson/library-list";

export default function LibraryPage() {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
        <LibraryList />
      </div>
    </AppShell>
  );
}
