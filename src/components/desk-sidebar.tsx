"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { ActorSwitcher } from "@/components/actor-switcher";
import { groupIdForPath, NAV_GROUPS, PINNED_HOME, pathIsActive } from "@/components/desk-nav-groups";
import { logoutDesk } from "@/app/actions/auth";
import type { Actor } from "@/lib/auth/rbac";
import {
  readSidebarPrefs,
  resolveOpenSection,
  toggleAccordionId,
  writeSidebarPrefs,
  type SidebarRail,
} from "@/lib/desk/sidebar-accordion";
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
  const [rail, setRail] = useState<SidebarRail>("expanded");
  const [ready, setReady] = useState(false);
  const HomeIcon = PINNED_HOME.icon;
  const homeActive = pathIsActive(pathname, PINNED_HOME);
  const narrow = rail === "narrow";

  useEffect(() => {
    const prefs = readSidebarPrefs();
    setRail(prefs.rail);
    setOpenId(resolveOpenSection(pathname, prefs.openId));
    setReady(true);
    // First paint uses the active route; localStorage hydrates once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    const routeGroup = groupIdForPath(pathname);
    if (routeGroup) setOpenId(routeGroup);
  }, [pathname, ready]);

  useEffect(() => {
    if (!ready) return;
    writeSidebarPrefs({ openId, rail });
  }, [openId, rail, ready]);

  function onSectionClick(id: string) {
    setOpenId((current) => toggleAccordionId(current, id));
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex",
        narrow ? "w-14" : "w-60",
      )}
    >
      <div className={cn("border-b border-sidebar-border", narrow ? "px-2 py-3" : "px-4 py-4")}>
        <Link href="/" className="block" title="FitFirst home">
          <div className={cn("font-semibold tracking-tight text-white", narrow ? "text-center text-sm" : "text-lg")}>
            {narrow ? "FF" : "FitFirst"}
          </div>
          {narrow ? null : (
            <div className="text-caption text-sidebar-foreground/80">
              Owner desk · filter-first P&amp;C
            </div>
          )}
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2" aria-label="Desk">
        <Link
          href={PINNED_HOME.href}
          title={PINNED_HOME.label}
          className={cn(
            "mb-1 flex items-center rounded-md py-2 text-sm font-semibold",
            narrow ? "justify-center px-0" : "gap-2 px-2.5",
            homeActive
              ? "bg-[var(--ff-card)] text-navy"
              : "text-white hover:bg-sidebar-accent hover:text-white",
          )}
        >
          <HomeIcon className="size-3.5 opacity-80" />
          {narrow ? <span className="sr-only">{PINNED_HOME.label}</span> : <span className="flex-1">{PINNED_HOME.label}</span>}
        </Link>
        {NAV_GROUPS.map((group) => {
          const open = openId === group.id;
          const GroupIcon = group.icon;
          const panelId = `ff-nav-${group.id}`;
          return (
            <div key={group.id}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                title={group.label}
                onClick={() => onSectionClick(group.id)}
                className={cn(
                  "flex w-full items-center rounded-md py-1.5 text-caption font-semibold uppercase tracking-wide text-sidebar-foreground/80 hover:text-white",
                  narrow ? "justify-center px-0" : "justify-between px-2.5",
                )}
              >
                <span className={cn("flex items-center", narrow ? "" : "gap-2")}>
                  <GroupIcon className="size-3.5 opacity-80" />
                  {narrow ? <span className="sr-only">{group.label}</span> : group.label}
                </span>
                {narrow ? null : (
                  <ChevronDown className={cn("size-3.5 transition", open ? "rotate-180" : "")} />
                )}
              </button>
              {open ? (
                <div id={panelId} className="mt-0.5 space-y-0.5" role="region" aria-label={group.label}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const settingsSection = search.get("section");
                    const active = item.href.includes("section=")
                      ? pathname === "/settings" && settingsSection === "phone" && item.href.includes("section=phone")
                      : pathIsActive(pathname, item);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        className={cn(
                          "flex items-center rounded-md py-1.5 text-sm",
                          narrow ? "justify-center px-0" : "gap-2 px-2.5",
                          active
                            ? "bg-[var(--ff-card)] text-navy"
                            : "text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-white",
                        )}
                      >
                        <Icon className="size-3.5 opacity-80" />
                        {narrow ? (
                          <span className="sr-only">{item.label}</span>
                        ) : (
                          <span className="flex-1">{item.label}</span>
                        )}
                        {!narrow && item.match === "/notifications" && unread > 0 ? (
                          <span className="rounded-sm bg-fit-flag px-1.5 text-caption font-semibold text-white">
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
      <div className={cn("space-y-3 border-t border-sidebar-border py-3", narrow ? "px-1.5" : "px-3")}>
        {!narrow && users.length > 0 && actor.id ? <ActorSwitcher actor={actor} users={users} /> : null}
        <button
          type="button"
          title={narrow ? "Expand sidebar" : "Collapse sidebar to icons"}
          aria-pressed={narrow}
          onClick={() => setRail((current) => (current === "narrow" ? "expanded" : "narrow"))}
          className={cn(
            "flex w-full items-center rounded-md py-1.5 text-caption text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white",
            narrow ? "justify-center px-0" : "gap-2 px-1",
          )}
        >
          {narrow ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
          {narrow ? <span className="sr-only">Expand sidebar</span> : <span>Collapse sidebar</span>}
        </button>
        {narrow ? null : (
          <div className="flex gap-2 px-1 text-caption text-sidebar-foreground/80">
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
        )}
      </div>
    </aside>
  );
}
