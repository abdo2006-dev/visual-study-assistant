export function UnsupportedVisual({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="rounded-md border border-dashed border-border p-4 text-sm">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{reason}</p>
    </div>
  );
}
