"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FunnelIcon } from "@/components/lists/funnel-icon";
import type { ListSortDir } from "@/lib/list-columns";
import { cn } from "@/lib/utils";

export function ColumnSortFilter({
  label,
  active,
  filterOptions,
  filterValue,
  onFilterValue,
  onSort,
}: {
  label: string;
  active: ListSortDir | null;
  filterOptions: string[];
  filterValue: string;
  onFilterValue: (value: string) => void;
  onSort: (dir: ListSortDir | null) => void;
}) {
  const marked = Boolean(active || filterValue);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Filter ${label}`}
        data-list-col-filter=""
        data-sorted={active ?? undefined}
        data-filtered={filterValue || undefined}
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-md border-0 p-0",
          marked
            ? "bg-navy/15 text-navy ring-1 ring-navy/40 hover:bg-navy/20"
            : "bg-transparent text-muted-foreground hover:bg-muted hover:text-navy",
        )}
      >
        <FunnelIcon active={marked} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[4.25rem] p-0.5">
        <DropdownMenuItem
          data-sort-dir="asc"
          data-selected={active === "asc" ? "true" : undefined}
          onClick={() => onSort("asc")}
          className={cn(
            "justify-center px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
            active === "asc" && "bg-secondary text-navy",
          )}
        >
          ASC
        </DropdownMenuItem>
        <DropdownMenuItem
          data-sort-dir="desc"
          data-selected={active === "desc" ? "true" : undefined}
          onClick={() => onSort("desc")}
          className={cn(
            "justify-center px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
            active === "desc" && "bg-secondary text-navy",
          )}
        >
          DESC
        </DropdownMenuItem>
        {filterOptions.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              data-filter-value=""
              data-selected={!filterValue ? "true" : undefined}
              onClick={() => onFilterValue("")}
              className={cn(
                "px-2 py-1 text-[11px] font-medium",
                !filterValue && "bg-secondary text-navy",
              )}
            >
              All
            </DropdownMenuItem>
            {filterOptions.map((option) => (
              <DropdownMenuItem
                key={option}
                data-filter-value={option}
                data-selected={filterValue === option ? "true" : undefined}
                onClick={() => onFilterValue(option)}
                className={cn(
                  "px-2 py-1 text-[11px] font-medium",
                  filterValue === option && "bg-secondary text-navy",
                )}
              >
                {option}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
