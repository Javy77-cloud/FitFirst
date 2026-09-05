"use client";

import Link from "next/link";
import { SettingsGroupIcon } from "@/components/settings/settings-group-icon";
import {
  SETTINGS_NAV,
  settingsChildFor,
  settingsGroupFor,
  type SettingsNavId,
} from "@/lib/settings/nav";
import { cn } from "@/lib/utils";

export function SettingsNav({ current }: { current: SettingsNavId }) {
  const activeGroup = settingsGroupFor(current);
  const activeChild = settingsChildFor(current);

  return (
    <nav
      aria-label="Settings groups"
      className="ff-card w-full shrink-0 overflow-hidden lg:sticky lg:top-4 lg:w-72"
    >
      <div className="border-b border-border px-3 py-2">
        <Link href="/settings" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-navy">
          All settings
        </Link>
        <p className="text-xs text-muted-foreground">Setup groups, then the page.</p>
      </div>
      <ul className="space-y-1.5 p-2">
        {SETTINGS_NAV.map((group) => {
          const groupActive = group.id === current || group.id === activeGroup;
          return (
            <li key={group.id}>
              <article
                className={cn(
                  "rounded-md border px-2.5 py-2",
                  groupActive ? "border-primary/40 bg-secondary/80" : "border-transparent bg-secondary/40",
                )}
              >
                <Link href={group.href} className="flex items-start gap-2">
                  <SettingsGroupIcon name={group.icon} className="size-8" />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="block text-sm font-semibold text-navy">{group.label}</span>
                      {group.badge ? (
                        <span className="rounded-sm bg-card px-1 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                          {group.badge}
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">{group.hint}</span>
                  </span>
                </Link>
                {groupActive ? (
                  <ul className="mt-1.5 space-y-0.5 border-t border-border/70 pt-1.5">
                    {group.children.map((child) => {
                      const childActive = activeChild === child.id;
                      return (
                        <li key={`${group.id}-${child.id}-${child.href}`}>
                          <Link
                            href={child.href}
                            className={cn(
                              "block rounded-md px-2 py-1 text-sm",
                              childActive
                                ? "bg-primary text-primary-foreground"
                                : "text-navy hover:bg-card",
                            )}
                          >
                            {child.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </article>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
