import type { ReactNode } from "react";
import Link from "next/link";
import { isNull, and, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import { DeskNav } from "@/components/desk-nav";
import { SmartSearch } from "@/components/smart-search";
import { currentDeskSession } from "@/lib/auth/session";
import { alertVisibleWhere } from "@/lib/alerts/visibility";
import { logoutDesk } from "@/app/actions/auth";
import { loadAgencyBrand } from "@/lib/desk/brand";

export async function AppShell({
  children,
  title,
  eyebrow,
  actions,
  columns,
}: {
  children: ReactNode;
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  /** Column picker — far-right control on the title row. Sort/pin live on sheet headers. */
  columns?: ReactNode;
}) {
  const session = await currentDeskSession();
  const [count] = await db
    .select({ n: sql<number>`count(*)` })
    .from(alerts)
    .where(and(alertVisibleWhere(session, DEFAULT_TENANT_ID), isNull(alerts.readAt)));
  const unread = Number(count?.n ?? 0);
  const brand = await loadAgencyBrand();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="border-b border-sidebar-border px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt="" className="size-10 rounded-md bg-white object-contain p-0.5" />
            ) : (
              <span className="flex size-10 items-center justify-center rounded-md border border-sidebar-border text-xs text-sidebar-foreground/60">
                Logo
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold tracking-tight text-sidebar-foreground">
                {brand.name}
              </span>
              <span className="block text-xs text-sidebar-foreground/70">
                {session.isAgent ? "Agent desk" : "Admin desk"}
              </span>
            </span>
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          <DeskNav unread={unread} variant="sidebar" />
        </nav>
        <div className="border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-foreground/70">
          <div className="font-medium text-sidebar-foreground">{session.name || "Not signed in"}</div>
          <div>
            {session.isAgent
              ? "Agent · own book"
              : session.isAdmin
                ? "Admin · all book"
                : "Sign in required"}
          </div>
          <div className="mt-2 flex gap-2">
            <Link href="/login" className="text-sidebar-foreground hover:underline">
              {session.signedIn ? "Switch user" : "Sign in"}
            </Link>
            {session.user ? (
              <form action={logoutDesk}>
                <button type="submit" className="text-sidebar-foreground hover:underline">
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <nav className="flex gap-3 overflow-x-auto border-b border-border bg-card px-3 py-2 text-xs md:hidden">
          <DeskNav unread={unread} variant="mobile" />
        </nav>
        <header className="relative z-40 flex flex-wrap items-center justify-between gap-2 overflow-visible border-b border-border bg-card px-5 py-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {eyebrow ?? "Personal lines worksheet"}
            </div>
            <h1 className="text-lg font-semibold text-navy">{title}</h1>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 overflow-visible">
            <SmartSearch />
            {actions}
            {columns ? <div className="relative z-50 ml-1 shrink-0">{columns}</div> : null}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-5">{children}</main>
      </div>
    </div>
  );
}
