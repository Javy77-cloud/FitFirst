"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AUTOMATION_DESK_SECTIONS, AUTOMATION_DEV_SECTIONS } from "@/lib/automations/types";
import { cn } from "@/lib/utils";

function NavRow({
  items,
}: {
  items: { href: string; label: string; exact?: boolean }[];
}) {
  const pathname = usePathname() ?? "";
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm",
              active
                ? "bg-navy font-semibold text-white"
                : "border border-border bg-card text-navy hover:border-primary/40",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function AutomationsModuleNav() {
  return (
    <nav className="mb-4 space-y-2" aria-label="Automations sections">
      <NavRow
        items={[
          { href: "/automations", label: "Hub", exact: true },
          ...AUTOMATION_DESK_SECTIONS.map((section) => ({
            href: section.href,
            label: section.label,
          })),
        ]}
      />
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Developer tools
        </p>
        <NavRow
          items={[
            ...AUTOMATION_DEV_SECTIONS.map((section) => ({
              href: section.href,
              label: section.label,
            })),
            { href: "/settings/developer", label: "Developer Hub" },
          ]}
        />
      </div>
    </nav>
  );
}
