import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_SIZE,
  normalizePageSize,
  paginateRows,
  paginationPageLabel,
  paginationRangeLabel,
} from "./pagination";

describe("shared list pagination", () => {
  it("defaults to 25 and keeps 25 / 50 / 100 / 200", () => {
    expect(DEFAULT_PAGE_SIZE).toBe(25);
    expect(normalizePageSize(50)).toBe(50);
    expect(normalizePageSize(100)).toBe(100);
    expect(normalizePageSize(200)).toBe(200);
    expect(normalizePageSize(13)).toBe(25);
  });

  it("pages a list and writes the platform labels", () => {
    const rows = Array.from({ length: 312 }, (_, index) => index + 1);
    const first = paginateRows(rows, 1, 25);
    expect(first.slice).toHaveLength(25);
    expect(first.start).toBe(1);
    expect(first.end).toBe(25);
    expect(first.total).toBe(312);
    expect(first.totalPages).toBe(13);
    expect(paginationPageLabel(first.page, first.totalPages)).toBe("Page 1 of 13");
    expect(paginationRangeLabel(first.start, first.end, first.total)).toBe("Showing 1–25 of 312");
    const last = paginateRows(rows, 13, 25);
    expect(last.slice[0]).toBe(301);
    expect(last.end).toBe(312);
    expect(paginationRangeLabel(last.start, last.end, last.total)).toBe("Showing 301–312 of 312");
  });
});
