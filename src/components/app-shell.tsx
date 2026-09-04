import Link from "next/link";
import { Suspense } from "react";
import { isNull, eq, and, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import { DeskHeader } from "@/components/desk-header";
import { DeskSidebar } from "@/components/desk-sidebar";
import { FLAT_NAV } from "@/components/desk-nav";
import { SupportLauncher } from "@/components/support/help-center";
import { SupportProvider } from "@/components/support/support-context";

export async function AppShell({
  children,
  title,
  eyebrow,
  actions,
}: {
  children: React.ReactNode;
  title: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  const [count] = await db
    .select({ n: sql<number>`count(*)` })
    .from(alerts)
    .where(and(eq(alerts.tenantId, DEFAULT_TENANT_ID), isNull(alerts.readAt)));
  const unread = Number(count?.n ?? 0);

  return (
    <SupportProvider>
      <div className="flex min-h-screen bg-background">
        <Suspense fallback={<aside className="hidden w-56 shrink-0 bg-sidebar md:block" />}>
          <DeskSidebar unread={unread} />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <nav className="flex gap-3 overflow-x-auto border-b border-border bg-card px-3 py-2 text-xs md:hidden">
            {FLAT_NAV.map((item) => (
              <Link key={item.href} href={item.href} className="whitespace-nowrap text-primary">
                {item.label}
              </Link>
            ))}
          </nav>
          <DeskHeader title={title} eyebrow={eyebrow} actions={actions} unread={unread} />
          <main className="flex-1 p-5">{children}</main>
        </div>
        <Suspense fallback={null}>
          <SupportLauncher />
        </Suspense>
      </div>
    </SupportProvider>
  );
}
