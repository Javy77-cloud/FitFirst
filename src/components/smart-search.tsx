"use client";

import { useSearchParams } from "next/navigation";

export function SmartSearch() {
  const params = useSearchParams();
  const defaultQuery = params.get("q") ?? "";

  return (
    <form action="/search" method="get" className="flex items-center gap-1.5">
      <input
        type="search"
        name="q"
        key={defaultQuery}
        defaultValue={defaultQuery}
        placeholder="Search leads, deals, contacts, businesses, policies"
        aria-label="Smart Search"
        className="h-9 w-48 rounded-md border-2 border-navy bg-card px-2.5 text-sm font-medium text-navy shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/35 md:w-80"
      />
      <button
        type="submit"
        className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
      >
        Search
      </button>
    </form>
  );
}
