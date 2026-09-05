"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { filterLines, lineBook, type LineBook } from "@/lib/lines/catalog";
import { cn } from "@/lib/utils";

export function LinePicker({
  name = "line",
  defaultCode = "HO",
  compact = false,
}: {
  name?: string;
  defaultCode?: string;
  compact?: boolean;
}) {
  const [book, setBook] = useState<LineBook>(lineBook(defaultCode));
  const [query, setQuery] = useState("");
  const [code, setCode] = useState(defaultCode);
  const options = useMemo(() => filterLines(book, query), [book, query]);

  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      <input type="hidden" name={name} value={code} />
      <div>
        <Label className="text-xs">Line type</Label>
        <div className="mt-1 grid grid-cols-2 gap-1 rounded-md border border-border bg-muted p-0.5">
          {(["personal", "commercial"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setBook(value);
                const first = filterLines(value, "")[0];
                if (first) {
                  setCode(first.code);
                  setQuery("");
                }
              }}
              className={cn(
                "h-7 rounded-sm text-xs font-medium capitalize",
                book === value ? "bg-card text-navy shadow-sm" : "text-muted-foreground",
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor={`${name}-typeahead`} className="text-xs">
          Line
        </Label>
        <input
          id={`${name}-typeahead`}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={book === "personal" ? "Homeowners, auto, flood…" : "GL, BOP, workers comp…"}
          className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
        />
        <ul className="mt-1 max-h-40 overflow-auto rounded-md border border-border bg-card">
          {options.length === 0 ? (
            <li className="px-2 py-1.5 text-base text-muted-foreground">No matching line.</li>
          ) : (
            options.map((line) => (
              <li key={line.code}>
                <button
                  type="button"
                  onClick={() => {
                    setCode(line.code);
                    setQuery(line.label);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-2 py-1.5 text-left text-xs",
                    code === line.code ? "bg-fit-check-bg text-navy" : "hover:bg-muted",
                  )}
                >
                  <span>{line.label}</span>
                  <span className="font-mono text-helper text-muted-foreground">{line.code}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="mt-1 text-base text-muted-foreground">
          Most-used first. Selected: <span className="font-medium text-navy">{code}</span>
        </p>
      </div>
    </div>
  );
}
