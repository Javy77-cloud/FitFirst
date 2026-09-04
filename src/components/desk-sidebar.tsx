"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { groupIdForPath, NAV_GROUPS, pathIsActive } from "@/components/desk-nav";
import { cn } from "@/lib/utils";

const SIDEBAR_BG = "#d6e8f8";
const SIDEBAR_TEXT = "#111827";

export function DeskSidebar({ unread }: { unread: number }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const [openId, setOpenId] = useState(() => groupIdForPath(pathname));

  useEffect(() => {
    setOpenId(groupIdForPath(pathname));
  }, [pathname]);

  return (
    <aside
      className="hidden w-56 shrink-0 flex-col md:flex"
      style={{ backgroundColor: SIDEBAR_BG, color: SIDEBAR_TEXT }}
    >
      <div className="border-b border-[#9bb8d3] px-4 py-4">
        <Link href="/" className="block">
          <div className="text-lg font-semibold tracking-tight" style={{ color: SIDEBAR_TEXT }}>
            FitFirst
          </div>
          <div className="text-[11px]" style={{ color: "#1f2937" }}>
            Owner desk · filter-first P&amp;C
          </div>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {NAV_GROUPS.map((group) => {
          const open = openId === group.id;
          return (
            <div key={group.id}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenId(group.id)}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide hover:bg-[#c5dbf0]"
                style={{ color: "#1f2937" }}
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
                        ? pathname.startsWith("/settings") &&
                          item.href.includes(`section=${settingsSection ?? "phone"}`)
                        : pathIsActive(pathname, item);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px]",
                          active ? "bg-[#fffcf7]" : "hover:bg-[#c5dbf0]",
                        )}
                        style={{ color: SIDEBAR_TEXT }}
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
      <div className="border-t border-[#9bb8d3] px-4 py-3 text-[11px]" style={{ color: "#1f2937" }}>
        Single-tenant demo
        <br />
        No Zoho sync · no portal logins
      </div>
    </aside>
  );
}
