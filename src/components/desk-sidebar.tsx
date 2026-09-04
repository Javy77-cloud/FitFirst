"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { ActorSwitcher } from "@/components/actor-switcher";
import { groupIdForPath, NAV_GROUPS, PINNED_HOME, pathIsActive } from "@/components/desk-nav-groups";
import { logoutDesk } from "@/app/actions/auth";
import type { Actor } from "@/lib/auth/rbac";
import { cn } from "@/lib/utils";

export function DeskSidebar({
  unread,
  actor,
  users,
  signedIn,
}: {
  unread: number;
  actor: Actor;
  users: Actor[];
  signedIn: boolean;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const [openId, setOpenId] = useState(() => groupIdForPath(pathname));
  const HomeIcon = PINNED_HOME.icon;
  const homeActive = pathIsActive(pathname, PINNED_HOME);

  useEffect(() => {
    setOpenId(groupIdForPath(pathname));
  }, [pathname]);

  return (
    <aside className="hidden w-56 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="border-b border-sidebar-border px-4 py-4">
        <Link href="/" className="block">
          <div className="text-lg font-semibold tracking-tight text-white">FitFirst</div>
          <div className="text-[11px] text-sidebar-foreground/70">
            Owner desk · filter-first P&amp;C
          </div>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        <Link
          href={PINNED_HOME.href}
          className={cn(
            "mb-1 flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-semibold",
            homeActive
              ? "bg-[var(--ff-card)] text-navy"
              : "text-white hover:bg-sidebar-accent hover:text-white",
          )}
        >
          <HomeIcon className="size-3.5 opacity-80" />
          <span className="flex-1">{PINNED_HOME.label}</span>
        </Link>
        {NAV_GROUPS.map((group) => {
          const open = openId === group.id;
          return (
            <div key={group.id}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenId(group.id)}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/70 hover:text-white"
              >
                {group.label}
                <ChevronDown className={cn("size-3.5 transition", open ? "rotate-180" : "")} />
              </button>
              {open ? (
                <div className="mt-0.5 space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const settingsSection = search.get("section");
                    const active =
                      group.id === "settings"
                        ? pathname.startsWith(item.match ?? "/settings") &&
                          (item.href.includes("section=")
                            ? item.href.includes(`section=${settingsSection ?? "phone"}`)
                            : pathname.startsWith(item.match ?? item.href))
                        : pathIsActive(pathname, item);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px]",
                          active
                            ? "bg-[var(--ff-card)] text-navy"
                            : "text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-white",
                        )}
                      >
                        <Icon className="size-3.5 opacity-80" />
                        <span className="flex-1">{item.label}</span>
                        {item.match === "/alerts" && unread > 0 ? (
                          <span className="rounded-sm bg-fit-flag px-1.5 text-[10px] font-semibold text-white">
                            {unread}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
      <div className="space-y-3 border-t border-sidebar-border px-3 py-3">
        {users.length > 0 && actor.id ? <ActorSwitcher actor={actor} users={users} /> : null}
        <div className="flex gap-2 px-1 text-[11px] text-sidebar-foreground/70">
          <Link href="/login" className="hover:text-white hover:underline">
            {signedIn ? "Switch user" : "Sign in"}
          </Link>
          {signedIn ? (
            <form action={logoutDesk}>
              <button type="submit" className="hover:text-white hover:underline">
                Sign out
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
