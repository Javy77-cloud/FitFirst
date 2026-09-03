import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "documents", label: "Documents" },
  { id: "risk", label: "Master risk" },
  { id: "markets", label: "Markets" },
  { id: "quotes", label: "Quotes" },
] as const;

export type DealTabId = (typeof TABS)[number]["id"];

export function parseDealTab(value: string | undefined): DealTabId {
  return TABS.some((tab) => tab.id === value) ? (value as DealTabId) : "documents";
}

export function DealTabs({
  dealId,
  active,
  panels,
}: {
  dealId: string;
  active: DealTabId;
  panels: Record<DealTabId, React.ReactNode>;
}) {
  return (
    <div>
      <nav
        aria-label="Deal sections"
        className="inline-flex flex-wrap gap-1 rounded-md bg-muted p-1"
      >
        {TABS.map((tab) => {
          const selected = tab.id === active;
          return (
            <Link
              key={tab.id}
              href={`/deals/${dealId}?tab=${tab.id}`}
              scroll={false}
              prefetch
              className={cn(
                "rounded-sm px-2.5 py-1 text-sm font-medium",
                selected
                  ? "bg-card text-navy shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4">{panels[active]}</div>
    </div>
  );
}
