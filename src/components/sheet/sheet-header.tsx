import { MoreHorizontal, Pin } from "lucide-react";
import { FunnelIcon } from "@/components/lists/funnel-icon";
import { isLiveSearchColumn } from "@/lib/list-columns";
import { tagModuleForList, tagModuleLabel } from "@/lib/tags/module-tags";
import { cn } from "@/lib/utils";

export function SheetHeader({
  table,
  col,
  children,
  className,
  dataCol,
}: {
  table: string;
  col: string;
  children: React.ReactNode;
  className?: string;
  /** Override the column-picker attribute. Defaults to `table.col`. */
  dataCol?: string;
}) {
  const label = typeof children === "string" ? children : "Column";
  const liveSearch = isLiveSearchColumn({ id: col, label });
  const tagModule = tagModuleForList(table);

  return (
    <th
      data-col={dataCol ?? `${table}.${col}`}
      data-sheet-col={col}
      data-sheet-table={table}
      aria-sort="none"
      className={cn("ff-sheet-th", className)}
    >
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          data-sheet-cycle={liveSearch ? undefined : ""}
          data-sheet-table={table}
          data-sheet-col={col}
          className="inline-flex min-w-0 items-center gap-1 text-left font-semibold text-inherit hover:text-navy"
        >
          <span className="truncate">{children}</span>
        </button>
        {liveSearch ? null : (
          <details data-sheet-funnel className="relative">
            <summary
              className="inline-flex size-6 shrink-0 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-navy [&::-webkit-details-marker]:hidden"
              aria-label={`Filter ${label}`}
              data-list-col-filter=""
            >
              <FunnelIcon />
            </summary>
            <div className="absolute right-0 z-80 mt-1 min-w-[4.25rem] rounded-md border border-border bg-card p-0.5 text-sm shadow-lg">
              <button
                type="button"
                data-sheet-sort="asc"
                data-sheet-table={table}
                data-sheet-col={col}
                className="flex w-full justify-center rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-navy hover:bg-muted"
              >
                ASC
              </button>
              <button
                type="button"
                data-sheet-sort="desc"
                data-sheet-table={table}
                data-sheet-col={col}
                className="flex w-full justify-center rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-navy hover:bg-muted"
              >
                DESC
              </button>
            </div>
          </details>
        )}
        <Pin data-icon="pin" className="hidden size-3 shrink-0 text-navy" aria-hidden />
        <details data-sheet-menu className="relative">
          <summary
            className="inline-flex size-6 shrink-0 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-navy [&::-webkit-details-marker]:hidden"
            aria-label={`${label} options`}
          >
            <MoreHorizontal className="size-3.5" />
          </summary>
          <div
            data-sheet-menu-panel
            className="z-80 min-w-52 rounded-md border border-border bg-card p-1 text-sm shadow-lg"
          >
            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Organize
            </p>
            <button
              type="button"
              data-sheet-pin
              data-sheet-table={table}
              data-sheet-col={col}
              className="flex w-full rounded-md px-2 py-1.5 text-left text-navy hover:bg-muted"
            >
              Pin column
            </button>
            {tagModule ? (
              <a
                href={`/settings/tags?module=${tagModule}`}
                data-ff-manage-tags=""
                className="flex w-full rounded-md px-2 py-1.5 text-left text-navy hover:bg-muted"
              >
                Manage Tags
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {tagModuleLabel(tagModule)}
                </span>
              </a>
            ) : null}
          </div>
        </details>
      </div>
    </th>
  );
}
