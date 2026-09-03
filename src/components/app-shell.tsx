import Link from "next/link";
import { isNull, eq, and, sql } from "drizzle-orm";
import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  Contact,
  FileStack,
  Files,
  Home,
  ListTodo,
  Mail,
  MessageSquare,
  PenLine,
  Shield,
  Users,
} from "lucide-react";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import { listDueCalls } from "@/lib/db/ops-queries";
import { PhoneButton } from "@/components/ops/activity-extras";
import { QuickAddLinks } from "@/components/ops/quick-add";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/deals", label: "Deals", icon: ClipboardList },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/policies", label: "Policies", icon: Shield },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/documents", label: "Documents", icon: Files },
  { href: "/campaigns", label: "Campaigns", icon: Mail },
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
  const dueCalls = await listDueCalls();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-56 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
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
        <div className="border-t border-sidebar-border px-4 py-3 text-[11px] text-sidebar-foreground/60">
          <Link href="/esign" className="flex items-center gap-1.5 hover:text-white">
            <PenLine className="size-3" /> E-sign
          </Link>
          <Link href="/settings/sms" className="mt-1 flex items-center gap-1.5 hover:text-white">
            <MessageSquare className="size-3" /> SMS settings
          </Link>
          <div className="mt-2">
            Single-tenant demo
            <br />
            No Zoho · stubs only
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-5 py-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Personal lines worksheet
            </div>
            <h1 className="text-lg font-semibold text-navy">{title}</h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <QuickAddLinks hrefFor={(kind) => `/calendar?new=1&kind=${kind}`} />
            {actions}
          </div>
        </header>
        {dueCalls.length > 0 ? (
          <div className="border-b border-border bg-fit-flag-bg px-5 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-fit-flag">
              Due calls — in-app only, no Twilio
            </div>
            <ul className="mt-1 space-y-1">
              {dueCalls.map(({ activity, contact }) => (
                <li key={activity.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <Link href={`/calendar?activity=${activity.id}`} className="font-medium text-navy hover:underline">
                    {activity.title}
                  </Link>
                  {contact ? (
                    <Link href={`/contacts/${contact.id}`} className="text-xs text-muted-foreground hover:underline">
                      {contact.lastName}, {contact.firstName}
                    </Link>
                  ) : null}
                  <PhoneButton phone={contact?.phone} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <main className="flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}
