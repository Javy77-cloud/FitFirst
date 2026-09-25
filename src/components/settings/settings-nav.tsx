"use client";

import Link from "next/link";
import { SettingsGroupIcon } from "@/components/settings/settings-group-icon";
import { SettingsPinnedLinks } from "@/components/settings/settings-pinned-links";
import { SettingsSearch } from "@/components/settings/settings-search";
import {
  SETTINGS_NAV,
  settingsChildFor,
  settingsGroupFor,
  type SettingsNavId,
} from "@/lib/settings/nav";
import { cn } from "@/lib/utils";

export function SettingsNav({
  current,
  showMacros = true,
}: {
  current: SettingsNavId;
  showMacros?: boolean;
}) {
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

        <div className="mt-2">
          <SettingsSearch compact />
        </div>
      </div>
      <SettingsPinnedLinks current={current} compact />
      <ul className="space-y-1.5 p-2">
        {SETTINGS_NAV.map((group) => {
          const groupActive = group.id === current || group.id === activeGroup;
          const children = group.children.filter((child) => showMacros || child.id !== "macros");
          const primary = children.filter((child) => !child.advanced);
          const advanced = children.filter((child) => child.advanced);
          return (
            <li key={group.id}>
              <article
                className={cn(
                  "rounded-md border px-2.5 py-2",
                  groupActive ? "border-navy/40 bg-navy/5" : "border-transparent bg-secondary/40",
                )}
              >
                <Link href={group.href} className="flex items-start gap-2">
                  <SettingsGroupIcon name={group.icon} className="size-8" tone={groupActive ? "navy" : "default"} />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="block text-sm font-semibold text-navy">{group.label}</span>
                      {group.badge ? (
                        <span className="rounded-sm bg-navy/10 px-1 py-0.5 text-[10px] font-semibold uppercase text-navy">
                          {group.badge}
                        </span>
                      ) : null}
                    </span>

                  </span>
                </Link>
                {groupActive ? (
                  <ul className="mt-1.5 space-y-0.5 border-t border-navy/15 pt-1.5">
                    {primary.map((child) => {
                      const childActive = activeChild === child.id;
                      return (
                        <li key={`${group.id}-${child.id}-${child.href}`}>
                          <Link
                            href={child.href}
                            className={cn(
                              "block rounded-md px-2 py-1 text-sm",
                              childActive
                                ? "bg-navy text-white"
                                : "text-navy hover:bg-card",
                            )}
                          >
                            {child.label}
                          </Link>
                        </li>
                      );
                    })}
                    {advanced.length ? (
                      <li className="pt-1">
                        <p className="px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ff-terracotta)]">
                          Advanced / Admin
                        </p>
                        <ul className="space-y-0.5">
                          {advanced.map((child) => {
                            const childActive = activeChild === child.id;
                            return (
                              <li key={`${group.id}-${child.id}-${child.href}`}>
                                <Link
                                  href={child.href}
                                  className={cn(
                                    "block rounded-md px-2 py-1 text-sm",
                                    childActive
                                      ? "bg-navy text-white"
                                      : "text-navy/80 hover:bg-card",
                                  )}
                                >
                                  {child.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    ) : null}
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
