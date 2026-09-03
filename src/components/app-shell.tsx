import Link from "next/link";
import { isNull, eq, and, sql } from "drizzle-orm";
import {
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  Contact,
  FileStack,
  Home,
  Columns3,
  Shield,
  Users,
} from "lucide-react";
import { DeskAgentSwitcher } from "@/components/crm/desk-agent-switcher";
import { getCurrentAgent } from "@/lib/crm/desk-agent";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: Columns3 },
  { href: "/deals", label: "Deals", icon: ClipboardList },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/businesses", label: "Businesses", icon: Briefcase },
  { href: "/policies", label: "Policies", icon: Shield },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/reviews", label: "Reviews", icon: CalendarClock },
  { href: "/carriers", label: "Carriers", icon: Building2 },
  { href: "/logs", label: "Decline log", icon: FileStack },
  { href: "/alerts", label: "Alerts", icon: Bell },
];

export async function AppShell({
  children,
  title,
  actions,
}: {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}) {
  const [count] = await db
    .select({ n: sql<number>`count(*)` })
    .from(alerts)
    .where(and(eq(alerts.tenantId, DEFAULT_TENANT_ID), isNull(alerts.readAt)));
  const unread = Number(count?.n ?? 0);
  const agent = await getCurrentAgent();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-56 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="border-b border-sidebar-border px-4 py-4">
          <Link href="/" className="block">
            <div className="text-lg font-semibold tracking-tight text-white">FitFirst</div>
            <div className="text-[11px] text-sidebar-foreground/70">
              Filter-first P&amp;C rater
            </div>
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-white"
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
        <div className="space-y-2 border-t border-sidebar-border px-3 py-3">
          <DeskAgentSwitcher />
          <p className="text-[11px] text-sidebar-foreground/60">
            Column layouts are per agent.
            <br />
            No Zoho sync · no portal logins
          </p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-card md:hidden">
          <div className="px-4 py-2 text-sm font-semibold text-navy">FitFirst</div>
          <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-md bg-muted px-2.5 py-1 text-xs text-navy"
              >
                {item.label}
                {item.href === "/alerts" && unread > 0 ? ` (${unread})` : ""}
              </Link>
            ))}
          </nav>
        </div>
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-3 md:px-5">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Personal lines worksheet · {agent.displayName}
              {agent.role === "admin" ? " (admin)" : ""}
            </div>
            <h1 className="text-lg font-semibold text-navy">{title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="md:hidden">
              <DeskAgentSwitcher compact />
            </div>
            {actions}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-5">{children}</main>
      </div>
    </div>
  );
}
