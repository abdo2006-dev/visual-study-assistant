import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { NavLinks } from "./nav-links";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-4">
        <span className="text-sm font-semibold tracking-tight">
          Visual Study Assistant
        </span>
      </div>
      <Separator />
      <div className="p-3">
        <NavLinks onNavigate={onNavigate} />
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-3 py-3">
        <p className="px-1 text-xs text-sidebar-foreground/60">
          Saved lessons will appear here once the local library is wired up
          (Milestone 2).
        </p>
      </ScrollArea>
    </div>
  );
}
