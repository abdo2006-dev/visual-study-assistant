import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export default function NewLessonPage() {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            New lesson
          </h1>
          <p className="text-sm text-muted-foreground">
            Paste an explanation or upload a screenshot of educational
            material. The AI pipeline that turns this into an interactive
            visual lesson lands in Milestone 3.
          </p>
        </div>

        <textarea
          disabled
          placeholder="Paste a text explanation here..."
          rows={8}
          className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div className="flex items-center gap-3">
          <Button disabled>Generate lesson</Button>
          <Button disabled variant="outline">
            Upload screenshot
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
