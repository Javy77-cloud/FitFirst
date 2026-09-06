"use client";

import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useLiveContainsQuery } from "@/hooks/use-live-contains-query";
import { hydrateLiveQuery, replaceQueryParam, setLiveQuery } from "@/lib/search/live-query";
import { cn } from "@/lib/utils";

export function LiveContainsInput({
  moduleId,
  initialQuery = "",
  placeholder = "Contains…",
  param = "q",
  className,
  inputClassName,
  "aria-label": ariaLabel = "Search",
  "data-list-col-search": listColSearch,
}: {
  moduleId: string;
  initialQuery?: string;
  placeholder?: string;
  param?: string;
  className?: string;
  inputClassName?: string;
  "aria-label"?: string;
  "data-list-col-search"?: string;
}) {
  const liveQuery = useLiveContainsQuery(moduleId, initialQuery);
  const [value, setValue] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const debounced = useDebouncedValue(value);

  useEffect(() => {
    hydrateLiveQuery(moduleId, initialQuery);
    setLiveQuery(moduleId, initialQuery);
  }, [moduleId, initialQuery]);

  useEffect(() => {
    if (!focused && liveQuery !== value) setValue(liveQuery);
  }, [focused, liveQuery, value]);

  useEffect(() => {
    setLiveQuery(moduleId, debounced);
    replaceQueryParam(param, debounced);
  }, [debounced, moduleId, param]);

  return (
    <label className={cn("inline-flex min-w-40 flex-col text-xs text-muted-foreground", className)}>
      <span className="sr-only">{ariaLabel}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        data-list-col-search={listColSearch}
        className={cn(
          "h-7 w-44 rounded-md border border-border bg-card px-2 text-xs text-navy",
          inputClassName,
        )}
      />
    </label>
  );
}
