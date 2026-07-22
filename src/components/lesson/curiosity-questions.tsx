"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { CuriosityQuestion } from "@/lib/schema/lesson";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<CuriosityQuestion["type"], string> = {
  why: "Why",
  how: "How",
  what: "What",
};

function CuriosityQuestionItem({ question }: { question: CuriosityQuestion }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-md border border-border bg-muted/40"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {TYPE_LABEL[question.type]}
        </span>
        <span className="flex-1">{question.question}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 text-sm leading-relaxed text-foreground/80">
        {question.answer}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CuriosityQuestions({ questions }: { questions: CuriosityQuestion[] }) {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {questions.map((question) => (
        <CuriosityQuestionItem key={question.id} question={question} />
      ))}
    </div>
  );
}
