import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { SettingsNav } from "@/components/settings/settings-nav";
import type { SettingsNavId } from "@/lib/settings/nav";

export function SettingsShell({
  title,
  current = "overview",
  children,
  actions,
  eyebrow = "Settings",
  allowMfaPending = false,
}: {
  title: string;
  current?: SettingsNavId;
  children: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
  allowMfaPending?: boolean;
}) {
  return (
    <AppShell title={title} eyebrow={eyebrow} actions={actions} allowMfaPending={allowMfaPending}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {current === "overview" ? null : <SettingsNav current={current} />}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </AppShell>
  );
}
