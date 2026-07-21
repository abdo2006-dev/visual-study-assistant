"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { applyLessonPatches, PatchApplicationError } from "@/lib/lessonPatch/applyLessonPatch";
import { condenseLessonForChat } from "@/lib/lessonPatch/condenseLesson";
import type { VisualLesson } from "@/lib/schema/lesson";
import { type LessonPatch, lessonPatchSchema } from "@/lib/schema/patch";
import { appendMessage, getConversation } from "@/lib/storage/conversationRepository";
import type { ChatMessage } from "@/lib/storage/db";
import { saveLesson } from "@/lib/storage/lessonRepository";
import { initializeRevisionsIfMissing, recordRevision } from "@/lib/storage/revisionRepository";

export function LessonChatPanel({
  lesson,
  onLessonChanged,
}: {
  lesson: VisualLesson;
  onLessonChanged: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    initializeRevisionsIfMissing(lesson);
    getConversation(lesson.id).then((loaded) => {
      if (!cancelled) setMessages(loaded);
    });
    return () => {
      cancelled = true;
    };
    // Only re-run when switching lessons — re-initializing on every edit
    // would re-fetch conversation history for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMessage: ChatMessage = {
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    await appendMessage(lesson.id, userMessage);

    try {
      const history = messages
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch("/api/lesson-patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson: condenseLessonForChat(lesson),
          message: trimmed,
          history,
        }),
        signal: controller.signal,
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to process your message.");
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: body.reply,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      await appendMessage(lesson.id, assistantMessage);

      const rawPatches: unknown[] = Array.isArray(body.patches) ? body.patches : [];
      const validPatches: LessonPatch[] = [];
      for (const raw of rawPatches) {
        const result = lessonPatchSchema.safeParse(raw);
        if (result.success) validPatches.push(result.data);
      }

      if (validPatches.length > 0) {
        const updatedLesson = applyLessonPatches(lesson, validPatches);
        await saveLesson(updatedLesson);
        await recordRevision(updatedLesson);
        onLessonChanged();
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Cancelled.");
      } else if (err instanceof PatchApplicationError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Failed to process your message.");
      }
    } finally {
      setSending(false);
      abortControllerRef.current = null;
    }
  }

  function handleCancel() {
    abortControllerRef.current?.abort();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-4">
        <MessageCircle className="size-4" />
        <span className="text-sm font-semibold">Chat</span>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="flex flex-col gap-2">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Ask to change this lesson — e.g. &ldquo;use fewer words&rdquo; or
              &ldquo;remove that visual&rdquo;.
            </p>
          )}
          {messages.map((message, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                message.role === "user"
                  ? "self-end bg-primary text-primary-foreground"
                  : "self-start bg-muted"
              }`}
            >
              {message.content}
            </div>
          ))}
        </div>
      </ScrollArea>
      {error && <p className="px-4 pb-2 text-xs text-destructive">{error}</p>}
      <Separator />
      <div className="flex gap-2 p-3">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          disabled={sending}
          placeholder="Ask to change this lesson..."
          rows={2}
          className="flex-1 resize-none rounded-md border border-input bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
        />
        {sending ? (
          <Button size="sm" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        ) : (
          <Button size="sm" onClick={handleSend} disabled={!input.trim()}>
            Send
          </Button>
        )}
      </div>
    </div>
  );
}
