"use client";

import { useEffect, useState } from "react";
import { FILL_STORAGE_KEY } from "@/lib/wire/sheet-packet";

export function FillDemoForm() {
  const [sheet, setSheet] = useState<Record<string, string>>({});
  const [source, setSource] = useState<string>("waiting");

  useEffect(() => {
    const raw = window.localStorage.getItem(FILL_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { source?: string; filled?: Record<string, string> };
      setSource(parsed.source ?? "quote_sheets");
      setSheet(parsed.filled ?? {});
    } catch {
      setSource("invalid");
    }
  }, []);

  const fields = [
    ["address1", "Property address"],
    ["city", "City"],
    ["year_built", "Year built"],
    ["coverage_a", "Coverage A"],
    ["occupancy", "Occupancy"],
  ] as const;

  return (
    <section className="ff-card p-4">
      <p className="mb-3 text-xs text-muted-foreground">
        Payload source: <strong>{source}</strong>
      </p>
      {fields.map(([key, label]) => (
        <label key={key} className="mb-2 block text-sm">
          <span className="text-xs text-muted-foreground">{label}</span>
          <input
            readOnly
            value={sheet[key] ?? ""}
            className="mt-0.5 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          />
        </label>
      ))}
    </section>
  );
}
