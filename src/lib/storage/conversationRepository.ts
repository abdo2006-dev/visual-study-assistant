import type { ChatMessage } from "@/lib/storage/db";

import { getDb } from "./db";

export async function getConversation(lessonId: string): Promise<ChatMessage[]> {
  const db = await getDb();
  const record = await db.get("conversations", lessonId);
  return record?.messages ?? [];
}

export async function appendMessage(lessonId: string, message: ChatMessage): Promise<void> {
  const db = await getDb();
  const existing = await db.get("conversations", lessonId);
  const messages = [...(existing?.messages ?? []), message];
  await db.put("conversations", { lessonId, messages });
}
