import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/carriers/logs", label: "Appetite" },
  { href: "/logs/fill-learning", label: "Fill Learning" },
] as const;

export function LogsTabs({ current }: { current: "appetite" | "fill-learning" }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1">
      {TABS.map((tab) => {
        const active =
          (current === "appetite" && tab.href === "/carriers/logs") ||
          (current === "fill-learning" && tab.href === "/logs/fill-learning");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm",
              active ? "bg-primary text-primary-foreground" : "bg-secondary text-navy hover:bg-secondary/70",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
