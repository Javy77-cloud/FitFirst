import type { ReactNode } from "react";
import Link from "next/link";
import { isNull, eq, and, sql } from "drizzle-orm";
import {
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  Columns3,
  Contact,
  FileStack,
  Calendar,
  Home,
  Kanban,
  ListChecks,
  Search,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import { SmartSearch } from "@/components/smart-search";
import { currentDeskSession } from "@/lib/auth/session";
import { logoutDesk } from "@/app/actions/auth";
import { loadAgencyBrand } from "@/lib/desk/brand";

const NAV = [
  { href: "/get-started", label: "Get Started", icon: ListChecks },
  { href: "/", label: "Home", icon: Home },
  { href: "/pipeline?pipeline=p-c", label: "Pipeline", icon: Kanban },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: Columns3 },
  { href: "/deals", label: "Deals", icon: ClipboardList },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/accounts", label: "Businesses", icon: Briefcase },
  { href: "/policies", label: "Policies", icon: Shield },
  { href: "/forms", label: "Forms", icon: FileStack },
  { href: "/quotes", label: "Quotes", icon: ClipboardList },
  { href: "/merge", label: "Merge", icon: Users },
  { href: "/work-queue", label: "Work queue", icon: ListChecks },
  { href: "/claims", label: "Claims log", icon: FileStack },
  { href: "/commissions", label: "Commissions", icon: Briefcase },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/search", label: "Search", icon: Search },
  { href: "/carriers", label: "Carriers", icon: Building2 },
  { href: "/settings", label: "Settings", icon: ClipboardList },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/phone", label: "Phone", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Building2 },
];

export async function AppShell({
  children,
  title,
  eyebrow,
  actions,
}: {
  children: ReactNode;
  title: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  const [count] = await db
    .select({ n: sql<number>`count(*)` })
    .from(alerts)
    .where(and(eq(alerts.tenantId, DEFAULT_TENANT_ID), isNull(alerts.readAt)));
  const unread = Number(count?.n ?? 0);
  const session = await currentDeskSession();
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
              <span className="block truncate text-base font-semibold tracking-tight text-white">
                {brand.name}
              </span>
              <span className="block text-xs text-sidebar-foreground/70">Owner desk</span>
            </span>
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[15px] text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-white"
              >
                <Icon className="size-3.5 opacity-80" />
                <span className="flex-1">{item.label}</span>
                {item.href === "/alerts" && unread > 0 ? (
                  <span className="rounded-sm bg-fit-flag px-1.5 text-[10px] font-semibold text-white">
                    {unread}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-foreground/70">
          <div className="font-medium text-white">{session.name}</div>
          <div className="capitalize">{session.role === "agent" ? "Agent · own book" : "Admin · all book"}</div>
          <div className="mt-2 flex gap-2">
            <Link href="/login" className="text-sidebar-foreground/90 hover:text-white">
              {session.user ? "Switch" : "Sign in"}
            </Link>
            {session.user ? (
              <form action={logoutDesk}>
                <button type="submit" className="text-sidebar-foreground/90 hover:text-white">
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <nav className="flex gap-3 overflow-x-auto border-b border-border bg-card px-3 py-2 text-xs md:hidden">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap text-primary">
              {item.label}
            </Link>
          ))}
        </nav>
        <header className="flex items-center justify-between border-b border-border bg-card px-5 py-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {eyebrow ?? "Personal lines worksheet"}
            </div>
            <h1 className="text-lg font-semibold text-navy">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <SmartSearch />
            {actions}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-5">{children}</main>
      </div>
    </div>
  );
}
