import { LessonPageClient } from "@/components/lesson/lesson-page-client";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <LessonPageClient id={id} />;
}
