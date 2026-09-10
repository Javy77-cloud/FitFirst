import Link from "next/link";
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";

export type QueryTab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

export function resolveQueryTab(
  tabs: readonly Pick<QueryTab, "id">[],
  requested: string | undefined,
) {
  if (requested && tabs.some((tab) => tab.id === requested)) return requested;
  return tabs[0]?.id ?? "";
}

export function QueryTabs({
  pathname,
  param,
  active,
  tabs,
  extra,
}: {
  pathname: string;
  param: string;
  active: string;
  tabs: QueryTab[];
  extra?: Record<string, string | undefined>;
}) {
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];
  if (!current) return null;

  return (
    <div>
      <div role="tablist" className={FF_CHIP_TAB_GROUP}>
        {tabs.map((tab) => {
          const selected = tab.id === current.id;
          const params = new URLSearchParams();
          if (tab.id !== tabs[0]?.id) params.set(param, tab.id);
          for (const [key, value] of Object.entries(extra ?? {})) {
            if (value && value !== "all") params.set(key, value);
          }
          const qs = params.toString();
          const href = qs ? `${pathname}?${qs}` : pathname;
          return (
            <Link
              key={tab.id}
              href={href}
              scroll={false}
              role="tab"
              aria-selected={selected}
              data-active={selected ? "true" : "false"}
              className={chipTabClass(selected)}
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
