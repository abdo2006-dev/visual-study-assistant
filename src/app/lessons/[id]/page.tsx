import { AppShell } from "@/components/layout/app-shell";
import { LessonWorkspace } from "@/components/lesson/lesson-workspace";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppShell>
      <LessonWorkspace id={id} />
    </AppShell>
  );
}
