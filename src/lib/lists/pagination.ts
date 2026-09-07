export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_PAGE_SIZE: PageSizeOption = 25;

export function isPageSizeOption(value: number): value is PageSizeOption {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(value);
}

export function normalizePageSize(value: number | string | null | undefined): PageSizeOption {
  const n = typeof value === "number" ? value : Number(value);
  return isPageSizeOption(n) ? n : DEFAULT_PAGE_SIZE;
}

export function paginateRows<T>(
  rows: T[],
  page: number,
  pageSize: number,
): {
  slice: T[];
  page: number;
  pageSize: PageSizeOption;
  totalPages: number;
  start: number;
  end: number;
  total: number;
} {
  const size = normalizePageSize(pageSize);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / size) || 1);
  const safePage = Math.min(Math.max(1, Math.round(page) || 1), totalPages);
  const startIndex = (safePage - 1) * size;
  const slice = rows.slice(startIndex, startIndex + size);
  const start = total === 0 ? 0 : startIndex + 1;
  const end = total === 0 ? 0 : startIndex + slice.length;
  return { slice, page: safePage, pageSize: size, totalPages, start, end, total };
}

export function paginationRangeLabel(start: number, end: number, total: number): string {
  if (total === 0) return "Showing 0–0 of 0";
  return `Showing ${start}–${end} of ${total}`;
}

export function paginationPageLabel(page: number, totalPages: number): string {
  return `Page ${page} of ${totalPages}`;
}

export function pageSizeStorageKey(moduleId: string): string {
  return `ff-list-page-size:${moduleId}`;
}
