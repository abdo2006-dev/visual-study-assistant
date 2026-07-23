import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function UnsupportedVisual({
  title,
  reason,
  action,
}: {
  title: string;
  reason: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed border-border p-4 text-sm sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{reason}</p>
      </div>
      {action && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={action.onClick}
          className="shrink-0"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          {action.label}
        </Button>
      )}
    </div>
  );
}
