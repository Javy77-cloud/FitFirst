import Link from "next/link";
import { cn } from "@/lib/utils";

export type SectionTab = {
  id: string;
  label: string;
  content: React.ReactNode;
  href?: string;
};

/**
 * Server-rendered tabs. Switching is a real navigation (`?tab=`), so Quote Sheet
 * and Quotes stay reachable even when client hydration / HMR is down.
 */
export function SectionTabs({
  tabs,
  defaultValue,
  active,
  param = "tab",
  extraQuery,
}: {
  tabs: SectionTab[];
  defaultValue: string;
  active?: string | null;
  param?: string;
  extraQuery?: Record<string, string | undefined>;
}) {
  const current = tabs.find((tab) => tab.id === active) ?? tabs.find((tab) => tab.id === defaultValue) ?? tabs[0];

  function hrefFor(id: string) {
    const query = new URLSearchParams();
    if (extraQuery) {
      for (const [key, value] of Object.entries(extraQuery)) {
        if (value) query.set(key, value);
      }
    }
    query.set(param, id);
    return `?${query.toString()}`;
  }

  return (
    <div>
      <div role="tablist" className="inline-flex flex-wrap gap-1 rounded-md bg-muted p-1">
        {tabs.map((tab) => {
          const selected = tab.id === current.id;
          const className = cn(
            "rounded-sm px-2.5 py-1 text-sm font-medium",
            selected
              ? "bg-card text-navy shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          );
          if (tab.href) {
            return (
              <Link
                key={tab.id}
                href={tab.href}
                role="tab"
                aria-selected={selected}
                className={className}
              >
                {tab.label}
              </Link>
            );
          }
          return (
            <Link
              key={tab.id}
              href={hrefFor(tab.id)}
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
      {urlTabs ? (
        <div role="tabpanel" className="mt-4">
          {current.content}
        </div>
      ) : (
        tabs.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            hidden={tab.id !== current.id}
            className={cn("mt-4", tab.id !== current.id && "hidden")}
          >
            {tab.content}
          </div>
        ))
      )}
    </div>
  );
}
