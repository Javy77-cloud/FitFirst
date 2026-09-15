"use client";

import { useState } from "react";
import {
  COMMISSION_BOOKS,
  COMMISSION_PERIOD_LABEL,
  COMMISSION_PERIODS,
  subfiltersFor,
} from "@/lib/commissions/filters";
import { visibleCommissionBooks, type DeskLineSettings } from "@/lib/desk/line-settings";

export function CommissionFilters({
  family,
  sub,
  range,
  status,
  lineSettings,
}: {
  family?: string;
  sub?: string;
  range?: string;
  status?: string;
  lineSettings?: Pick<DeskLineSettings, "writeLife" | "writeHealth">;
}) {
  const [book, setBook] = useState(family ?? "");
  const options = subfiltersFor(book);
  const books = visibleCommissionBooks(COMMISSION_BOOKS, lineSettings);

  return (
    <form method="get" className="mb-4 flex flex-wrap items-end gap-2 text-sm">
      {status && status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
      <label className="block text-[11px] text-muted-foreground">
        Insurance type
        <select
          name="family"
          value={book}
          onChange={(event) => setBook(event.target.value)}
          className="mt-1 h-8 min-w-32 rounded-md border border-input bg-card px-2 text-sm"
        >
          <option value="">All types</option>
          {books.map((row) => (
            <option key={row.value} value={row.value}>
              {row.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-[11px] text-muted-foreground">
        Subtype
        <select
          key={book || "none"}
          name="sub"
          defaultValue={options.some((row) => row.value === sub) ? sub : ""}
          disabled={options.length === 0}
          className="mt-1 h-8 min-w-36 rounded-md border border-input bg-card px-2 text-sm disabled:opacity-60"
        >
          <option value="">{book ? "All subtypes" : "Pick a type first"}</option>
          {options.map((row) => (
            <option key={row.value} value={row.value}>
              {row.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-[11px] text-muted-foreground">
        Dates
        <select
          name="range"
          defaultValue={range ?? "all"}
          className="mt-1 h-8 min-w-40 rounded-md border border-input bg-card px-2 text-sm"
        >
          {COMMISSION_PERIODS.map((key) => (
            <option key={key} value={key}>
              {COMMISSION_PERIOD_LABEL[key]}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="h-8 rounded-md border border-input px-3 text-xs">
        Apply
      </button>
      <a href="/commissions" className="h-8 px-2 text-xs leading-8 text-primary hover:underline">
        Clear
      </a>
    </form>
  );
}
