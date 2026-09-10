import Link from "next/link";
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/carriers/logs", label: "Appetite" },
  { href: "/logs/fill-learning", label: "Fill Learning" },
  { href: "/logs/synonym-candidates", label: "Synonym candidates" },
  { href: "/compliance", label: "Compliance" },
] as const;

export function LogsTabs({ current }: { current: "appetite" | "fill-learning" | "synonym-candidates" | "compliance" }) {
  return (
    <div className={cn("mb-4", FF_CHIP_TAB_GROUP)}>
      {TABS.map((tab) => {
        const active =
          (current === "appetite" && tab.href === "/carriers/logs") ||
          (current === "fill-learning" && tab.href === "/logs/fill-learning") ||
          (current === "synonym-candidates" && tab.href === "/logs/synonym-candidates") ||
          (current === "compliance" && tab.href === "/compliance");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={chipTabClass(active)}
            data-active={active ? "true" : "false"}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
