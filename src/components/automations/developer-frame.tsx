import type { ReactNode } from "react";
import Link from "next/link";
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
      {!isAdmin ? (
        <p className="mb-4 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Developer tools are Admin-only. Agents can see the tab. Ask Javy to create a function,
          key, webhook, or connection.
        </p>
      ) : (
        <p className="mb-3 text-xs text-muted-foreground">
          Same records as{" "}
          <Link href="/settings/developer" className="text-primary hover:underline">
            Settings → Developer Hub
          </Link>
          . Working stubs. No live Zoho writes.
        </p>
      )}
      {children}
    </AppShell>
  );
}
