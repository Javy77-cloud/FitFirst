"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/me", label: "Overview", exact: true },
  { href: "/settings/profile", label: "Edit Profile" },
  { href: "/settings/security", label: "Password" },
  { href: "/me?section=signature", label: "Email signature" },
  { href: "/me?section=templates", label: "Personal templates" },
  { href: "/me?section=notifications", label: "Notifications" },
  { href: "/me?section=timezone", label: "Timezone" },
  { href: "/social", label: "Connected accounts" },
  { href: "/settings/my-desk", label: "Desk appearance" },
] as const;

export function PersonalSettingsNav({ current }: { current: string }) {
  return (
    <nav aria-label="Personal settings" className="ff-card w-full shrink-0 overflow-hidden lg:sticky lg:top-4 lg:w-64">
      <div className="border-b border-border px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">This login</p>
        <p className="text-xs text-muted-foreground">Personal only. Agency Settings stay on the left rail for Admin.</p>
      </div>
      <ul className="space-y-0.5 p-2">
        {LINKS.map((link) => {
          const exact = "exact" in link && link.exact;
          const active = exact ? current === link.href : current === link.href || current.startsWith(`${link.href}`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "block rounded-md px-2 py-1.5 text-sm",
                  active ? "bg-primary text-primary-foreground" : "text-navy hover:bg-secondary",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
