import { AppShell } from "@/components/layout/app-shell";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-2 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Economical / balanced / highest-quality mode and provider status
          will live here (Milestone 3+).
        </p>
      </div>
    </AppShell>
  );
}
