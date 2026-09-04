"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AUTOMATION_HUB_SECTIONS } from "@/lib/automations/types";
import { cn } from "@/lib/utils";

export function AutomationsModuleNav() {
  const pathname = usePathname() ?? "";
  const items = [
    { href: "/automations", label: "Hub", exact: true },
    ...AUTOMATION_HUB_SECTIONS.map((section) => ({
      href: section.href,
      label: section.label,
      exact: false,
    })),
  ];

  return (
    <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="Automations sections">
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
    </nav>
  );
}
