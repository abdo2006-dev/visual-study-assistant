import { MessageCircle } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function ChatPanelContent() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-4">
        <MessageCircle className="size-4" />
        <span className="text-sm font-semibold">Chat</span>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Ask follow-up questions about the current lesson once one is
          generated (Milestone 7). For example: &ldquo;show inside and
          outside side by side&rdquo; or &ldquo;use fewer words&rdquo;.
        </p>
      </ScrollArea>
      <Separator />
      <div className="p-3">
        <div className="flex items-center rounded-md border border-input bg-transparent px-3 py-2 text-sm text-muted-foreground">
          Chat is not available until a lesson exists
        </div>
      </div>
    </div>
  );
}
