"use client";

import { useLayoutEffect, useRef } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal, Pin, PinOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { applySheetDom } from "@/components/sheet/apply-sheet";
import { useSheetLayout } from "@/components/sheet/sheet-store";

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
  const thRef = useRef<HTMLTableCellElement>(null);
  const { layout, setSort, cycleSort, clearSort, togglePin } = useSheetLayout(table);
  const active = layout.sort?.key === col ? layout.sort.dir : null;
  const pinned = layout.pinned.includes(col);

  useLayoutEffect(() => {
    const tableEl = thRef.current?.closest("table");
    if (tableEl) applySheetDom(tableEl, layout);
  }, [layout]);

  useLayoutEffect(() => {
    const tableEl = thRef.current?.closest("table");
    if (!tableEl) return;
    const ro = new ResizeObserver(() => applySheetDom(tableEl, layout));
    ro.observe(tableEl);
    return () => ro.disconnect();
  }, [layout]);

  const ariaSort = active === "asc" ? "ascending" : active === "desc" ? "descending" : "none";
  const SortGlyph = active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <th
      ref={thRef}
      data-col={dataCol ?? `${table}.${col}`}
      data-sheet-col={col}
      aria-sort={ariaSort}
      className={cn("ff-sheet-th", pinned && "ff-col-pinned", className)}
    >
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => cycleSort(col)}
          className="inline-flex min-w-0 items-center gap-1 text-left font-semibold text-inherit hover:text-navy"
        >
          <span className="truncate">{children}</span>
          <SortGlyph
            className={cn("size-3 shrink-0", active ? "text-navy" : "text-muted-foreground/70")}
            aria-hidden
          />
        </button>
        {pinned ? <Pin className="size-3 shrink-0 text-navy" aria-hidden /> : null}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-navy"
            aria-label={`${typeof children === "string" ? children : "Column"} options`}
          >
            <MoreHorizontal className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 min-w-56">
            <DropdownMenuLabel>Organize</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setSort(col, "asc")}>Sort A → Z</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSort(col, "desc")}>Sort Z → A</DropdownMenuItem>
            {active ? (
              <DropdownMenuItem onClick={clearSort}>Clear sort</DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => togglePin(col)}>
              {pinned ? (
                <>
                  <PinOff className="size-3.5" />
                  Unpin column
                </>
              ) : (
                <>
                  <Pin className="size-3.5" />
                  Pin column
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </th>
  );
}
