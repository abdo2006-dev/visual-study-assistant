import { AppShell } from "@/components/layout/app-shell";
import { ApiUsageDashboard } from "@/components/settings/api-usage-dashboard";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Economical / balanced / highest-quality mode selection and
            provider status will live here in a future milestone.
          </p>
        </div>
        <ApiUsageDashboard />
      </div>
    </AppShell>
  );
}
