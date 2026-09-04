import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { GLANCE_TABS, GLANCE_TAB_LABEL, glanceHref, type GlanceTab } from "@/lib/glance/tabs";
import { cn } from "@/lib/utils";

export function GlanceTabs({
  tab,
  counts,
}: {
  tab: GlanceTab;
  counts: Record<GlanceTab, number>;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {GLANCE_TABS.map((value) => (
        <Link
          key={value}
          href={glanceHref(value)}
          className={cn(buttonVariants({ size: "sm", variant: tab === value ? "default" : "outline" }))}
        >
          {GLANCE_TAB_LABEL[value]}
          <span className="ml-1 text-[11px] opacity-80">{counts[value]}</span>
        </Link>
      ))}
    </div>
  );
}
