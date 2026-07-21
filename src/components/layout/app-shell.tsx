import type { ReactNode } from "react";

import { ChatPanelContent } from "./chat-drawer";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

export function AppShell({
  children,
  chatPanel,
}: {
  children: ReactNode;
  chatPanel?: ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col">
      <TopBar chatPanel={chatPanel} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-64 shrink-0 border-r border-border md:block">
          <Sidebar />
        </aside>
        <main className="flex-1 overflow-y-auto">{children}</main>
        <aside className="hidden w-80 shrink-0 border-l border-border lg:block">
          {chatPanel ?? <ChatPanelContent />}
        </aside>
      </div>
    </div>
  );
}
