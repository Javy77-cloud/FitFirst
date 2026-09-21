"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { searchSettings } from "@/lib/settings/search";
import { cn } from "@/lib/utils";

export function SettingsSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const listId = useId();
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const hits = useMemo(() => searchSettings(query), [query]);
  const showList = open && query.trim().length > 0;

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div ref={rootRef} className={cn("relative", compact ? "" : "mb-4")} data-ff-settings-search="">
      <label htmlFor={inputId} className="sr-only">
        Search settings
      </label>
      <input
        id={inputId}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && hits[active] ? `${listId}-${active}` : undefined}
        placeholder="Search settings"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (!showList) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (event.key === "Enter") {
            event.preventDefault();
            const hit = hits[active];
            if (hit) go(hit.href);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className={cn(
          "w-full rounded-md border border-input bg-card text-sm text-navy outline-none placeholder:text-muted-foreground focus-visible:border-navy focus-visible:ring-2 focus-visible:ring-navy/30",
          compact ? "h-8 px-2.5" : "h-10 px-3",
        )}
      />
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-navy/20 bg-card py-1 shadow-md"
        >
          {hits.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">No settings match</li>
          ) : (
            hits.map((hit, index) => (
              <li key={hit.id} role="option" aria-selected={index === active} id={`${listId}-${index}`}>
                <Link
                  href={hit.href}
                  className={cn(
                    "block px-3 py-1.5 text-sm",
                    index === active ? "bg-navy text-white" : "text-navy hover:bg-secondary",
                  )}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => setOpen(false)}
                >
                  <span className="font-semibold">{hit.label}</span>
                  <span className={cn("mt-0.5 block text-[11px]", index === active ? "text-white/80" : "text-muted-foreground")}>
                    {hit.groupLabel}
                    {hit.hint ? ` · ${hit.hint}` : ""}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
