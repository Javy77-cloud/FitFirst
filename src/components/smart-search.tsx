"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { kindLabel, replaceQueryParam, setLiveQuery } from "@/lib/search/live-query";
import type { SearchHit } from "@/lib/wire/search";
import { cn } from "@/lib/utils";

type SearchResponse = { q: string; hits: SearchHit[] };

export function SmartSearch({ defaultQuery = "" }: { defaultQuery?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(defaultQuery);

  useEffect(() => {
    if (defaultQuery) return;
    const urlQ = new URLSearchParams(window.location.search).get("q") ?? "";
    if (urlQ && pathname === "/search") setQuery(urlQ);
  }, [defaultQuery, pathname]);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const debounced = useDebouncedValue(query);
  const trimmed = query.trim();

  useEffect(() => {
    const q = debounced.trim();
    setLiveQuery("chrome-search", q);
    if (pathname === "/search") replaceQueryParam("q", q);
    if (!q) {
      setHits([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("search failed");
        return (await response.json()) as SearchResponse;
      })
      .then((body) => {
        setHits(body.hits);
        setActive(0);
        setOpen(true);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setHits([]);
        setOpen(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debounced, pathname]);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const hit = hits[active];
    if (open && hit) {
      go(hit.href);
      return;
    }
    if (trimmed) go(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  const showPanel = open && Boolean(trimmed);

  return (
    <div ref={rootRef} className="relative w-full max-w-xl">
      <form action="/search" method="get" onSubmit={onSubmit} className="flex items-center gap-1">
        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (event.target.value.trim()) setOpen(true);
          }}
          onFocus={() => {
            if (trimmed) setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }
            if (!showPanel || hits.length === 0) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((index) => (index + 1) % hits.length);
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => (index - 1 + hits.length) % hits.length);
            }
          }}
          placeholder="Search contacts, leads, deals, businesses, policies, carriers"
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          className="h-9 w-full min-w-40 rounded-md border border-input bg-card px-2 text-sm md:min-w-72"
        />
      </form>
      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-md border border-border bg-card shadow-md"
        >
          {loading && hits.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No records containing “{trimmed}”.
            </p>
          ) : (
            <ul>
              {hits.map((hit, index) => (
                <li key={`${hit.kind}-${hit.id}`}>
                  <Link
                    href={hit.href}
                    role="option"
                    aria-selected={index === active}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block px-3 py-2 hover:bg-secondary",
                      index === active && "bg-secondary",
                    )}
                  >
                    <div className="text-[11px] uppercase text-muted-foreground">{kindLabel(hit.kind)}</div>
                    <div className="font-medium text-navy">{hit.title}</div>
                    <div className="text-sm text-muted-foreground">{hit.subtitle}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-border px-3 py-1.5 text-xs">
            <Link
              href={`/search?q=${encodeURIComponent(trimmed)}`}
              className="text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              See all results
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
