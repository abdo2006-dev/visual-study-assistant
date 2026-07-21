"use client";

import { Menu, PanelRight } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { ChatPanelContent } from "./chat-drawer";
import { Sidebar } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";

export function TopBar({ chatPanel }: { chatPanel?: ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3 md:px-4">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open lesson library"
              />
            }
          >
            <Menu className="size-4" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Lesson library</SheetTitle>
            <Sidebar />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold md:hidden">
          Visual Study Assistant
        </span>
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open chat"
              />
            }
          >
            <PanelRight className="size-4" />
          </SheetTrigger>
          <SheetContent side="right" className="w-80 p-0">
            <SheetTitle className="sr-only">Chat</SheetTitle>
            {chatPanel ?? <ChatPanelContent />}
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
