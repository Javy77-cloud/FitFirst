"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PAGE_SIZE_OPTIONS,
  paginationPageLabel,
  paginationRangeLabel,
  type PageSizeOption,
} from "@/lib/lists/pagination";

export function ListPagination({
  page,
  totalPages,
  start,
  end,
  total,
  pageSize,
  onPage,
  onPageSize,
}: {
  page: number;
  totalPages: number;
  start: number;
  end: number;
  total: number;
  pageSize: PageSizeOption;
  onPage: (page: number) => void;
  onPageSize: (size: PageSizeOption) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 px-3 py-2 text-xs text-navy"
      data-testid="list-pagination"
    >
      <label className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Rows</span>
        <select
          value={pageSize}
          aria-label="Rows per page"
          className="h-7 rounded-md border border-border bg-card px-1.5 text-xs"
          onChange={(event) => onPageSize(Number(event.target.value) as PageSizeOption)}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <span data-testid="list-pagination-range">{paginationRangeLabel(start, end, total)}</span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={page <= 1}
          aria-label="Previous page"
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        <span data-testid="list-pagination-page">{paginationPageLabel(page, totalPages)}</span>
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={page >= totalPages}
          aria-label="Next page"
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
