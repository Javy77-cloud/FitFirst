import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";

export function AutomationsDeveloperFrame({
  title,
  children,
  isAdmin,
  actions,
}: {
  title: string;
  children: ReactNode;
  isAdmin: boolean;
  actions?: ReactNode;
}) {
  return (
    <AppShell title={title} actions={isAdmin ? actions : undefined}>
      <AutomationsModuleNav />
      {children}
    </AppShell>
  );
}
