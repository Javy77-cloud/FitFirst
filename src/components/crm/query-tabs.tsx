import Link from "next/link";
import { cn } from "@/lib/utils";

export type QueryTab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

export function resolveQueryTab(tabs: Pick<QueryTab, "id">[], requested: string | undefined) {
  if (requested && tabs.some((tab) => tab.id === requested)) return requested;
  return tabs[0]?.id ?? "";
}

export function QueryTabs({
  pathname,
  param,
  active,
  tabs,
}: {
  pathname: string;
  param: string;
  active: string;
  tabs: QueryTab[];
}) {
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];
  if (!current) return null;

  return (
    <div>
      <div role="tablist" className="inline-flex flex-wrap gap-1 rounded-md bg-muted p-1">
        {tabs.map((tab) => {
          const selected = tab.id === current.id;
          const href =
            tab.id === tabs[0]?.id ? pathname : `${pathname}?${encodeURIComponent(param)}=${encodeURIComponent(tab.id)}`;
          return (
            <Link
              key={tab.id}
              href={href}
              scroll={false}
              role="tab"
              aria-selected={selected}
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
      </div>
      <div role="tabpanel" className="mt-4">
        {current.content}
      </div>
    </div>
  );
}
