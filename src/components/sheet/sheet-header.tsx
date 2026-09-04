import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal, Pin } from "lucide-react";
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
          data-sheet-cycle
          data-sheet-table={table}
          data-sheet-col={col}
          className="inline-flex min-w-0 items-center gap-1 text-left font-semibold text-inherit hover:text-navy"
        >
          <span className="truncate">{children}</span>
          <span data-sheet-glyph className="inline-flex">
            <ArrowUpDown data-icon="none" className="size-3 shrink-0 text-muted-foreground/70" aria-hidden />
            <ArrowUp data-icon="asc" className="hidden size-3 shrink-0 text-navy" aria-hidden />
            <ArrowDown data-icon="desc" className="hidden size-3 shrink-0 text-navy" aria-hidden />
          </span>
        </button>
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
              data-sheet-sort="asc"
              data-sheet-table={table}
              data-sheet-col={col}
              className="flex w-full rounded-md px-2 py-1.5 text-left text-navy hover:bg-muted"
            >
              Sort A → Z
            </button>
            <button
              type="button"
              data-sheet-sort="desc"
              data-sheet-table={table}
              data-sheet-col={col}
              className="flex w-full rounded-md px-2 py-1.5 text-left text-navy hover:bg-muted"
            >
              Sort Z → A
            </button>
            <button
              type="button"
              data-sheet-sort="clear"
              data-sheet-table={table}
              data-sheet-col={col}
              className="flex w-full rounded-md px-2 py-1.5 text-left text-navy hover:bg-muted"
            >
              Clear sort
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              data-sheet-pin
              data-sheet-table={table}
              data-sheet-col={col}
              className="flex w-full rounded-md px-2 py-1.5 text-left text-navy hover:bg-muted"
            >
              Pin column
            </button>
          </div>
        </details>
      </div>
    </th>
  );
}
