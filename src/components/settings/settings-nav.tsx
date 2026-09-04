"use client";

import Link from "next/link";
import { useState } from "react";
import {
  SETTINGS_NAV,
  settingsGroupFor,
  type SettingsNavId,
} from "@/lib/settings/nav";
import { cn } from "@/lib/utils";

export function SettingsNav({ current }: { current: SettingsNavId }) {
  const activeGroup = settingsGroupFor(current);
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SETTINGS_NAV.map((group) => [group.id, true])),
  );

  return (
    <nav
      aria-label="Settings sections"
      className="ff-card w-full shrink-0 overflow-hidden lg:sticky lg:top-4 lg:w-60"
    >
      <div className="border-b border-border px-3 py-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Settings
        </div>
        <p className="text-xs text-muted-foreground">Parent groups, then the page.</p>
      </div>
      <ul className="p-1.5">
        {SETTINGS_NAV.map((group) => {
          const expanded = open[group.id] ?? false;
          const groupActive = group.id === current || group.id === activeGroup;
          const hasChildren = group.children.length > 0;
          return (
            <li key={group.id} className="mb-0.5">
              <div className="flex items-stretch gap-0.5">
                <Link
                  href={group.href}
                  className={cn(
                    "min-w-0 flex-1 rounded-md px-2.5 py-1.5 text-sm",
                    group.id === current
                      ? "bg-primary text-primary-foreground"
                      : groupActive
                        ? "bg-secondary font-medium text-navy"
                        : "text-navy hover:bg-secondary/70",
                  )}
                >
                  <span className="block truncate">{group.label}</span>
                  <span
                    className={cn(
                      "block truncate text-[11px]",
                      group.id === current ? "text-primary-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    {group.hint}
                  </span>
                </Link>
                {hasChildren ? (
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-label={`${expanded ? "Collapse" : "Expand"} ${group.label}`}
                    onClick={() => setOpen((prev) => ({ ...prev, [group.id]: !expanded }))}
                    className="rounded-md px-2 text-xs text-muted-foreground hover:bg-secondary"
                  >
                    {expanded ? "–" : "+"}
                  </button>
                ) : null}
              </div>
              {hasChildren && expanded ? (
                <ul className="mb-1 ml-2 mt-0.5 border-l border-border pl-2">
                  {group.children.map((child) => (
                    <li key={`${group.id}-${child.id}-${child.href}`}>
                      <Link
                        href={child.href}
                        className={cn(
                          "block rounded-md px-2 py-1.5 text-sm",
                          current === child.id && child.href !== group.href
                            ? "bg-primary text-primary-foreground"
                            : current === child.id
                              ? "font-medium text-navy"
                              : "text-navy hover:bg-secondary/70",
                        )}
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
