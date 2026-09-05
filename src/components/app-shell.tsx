import type { ReactNode } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DeskHeader } from "@/components/desk-header";
import { DeskSidebar } from "@/components/desk-sidebar";
import { FLAT_NAV } from "@/components/desk-nav-groups";
import { SupportLauncher } from "@/components/support/help-center";
import { SupportProvider } from "@/components/support/support-context";
import { currentDeskSession, getActor } from "@/lib/auth/session";
import type { Actor } from "@/lib/auth/rbac";
import { listUsers, listAlerts } from "@/lib/db/queries";

export async function AppShell({
  children,
  title,
  eyebrow,
  actions,
  columns,
  allowMfaPending = false,
}: {
  children: ReactNode;
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  columns?: ReactNode;
  allowMfaPending?: boolean;
}) {
  const [session, actor, userRows, alertRows] = await Promise.all([
    currentDeskSession(),
    getActor(),
    listUsers(),
    listAlerts(),
  ]);
  if (session.signedIn && session.mfaStatus === "challenge") redirect("/login/mfa");
  if (session.signedIn && session.mfaStatus === "pending" && !allowMfaPending) {
    redirect("/enroll-mfa");
  }
  const unread = alertRows.filter((row) => !row.readAt).length;
  const users: Actor[] = userRows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email ?? "",
    role: row.role === "agent" ? "agent" : "admin",
  }));

  return (
    <SupportProvider>
      <div className="flex min-h-screen bg-background">
        <Suspense fallback={<aside className="hidden w-60 shrink-0 bg-sidebar md:block" />}>
          <DeskSidebar unread={unread} actor={actor} users={users} signedIn={session.signedIn} />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <nav className="flex gap-3 overflow-x-auto border-b border-border bg-card px-3 py-2 text-xs md:hidden">
            {FLAT_NAV.map((item) => (
              <Link key={item.href} href={item.href} className="whitespace-nowrap text-primary">
                {item.label}
              </Link>
            ))}
          </nav>
          <DeskHeader title={title} eyebrow={eyebrow} actions={actions ?? columns} unread={unread} />
          <main className="flex-1 p-5">{children}</main>
        </div>
        <Suspense fallback={null}>
          <SupportLauncher />
        </Suspense>
      </div>
    </SupportProvider>
  );
}
