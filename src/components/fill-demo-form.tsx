"use client";

import { useEffect, useState } from "react";
import { FILL_STORAGE_KEY } from "@/lib/wire/sheet-packet";

const FIELDS = [
  ["named_insured", "Named insured"],
  ["address1", "Property address"],
  ["city", "City"],
  ["state", "State"],
  ["zip", "ZIP"],
  ["year_built", "Year built"],
  ["coverage_a", "Coverage A"],
  ["occupancy", "Occupancy"],
  ["construction", "Construction"],
  ["current_carrier", "Current carrier"],
] as const;

export function FillDemoForm() {
  const [sheet, setSheet] = useState<Record<string, string>>({});
  const [source, setSource] = useState<string>("waiting");
  const [dealId, setDealId] = useState<string>("");

  useEffect(() => {
    const raw = window.localStorage.getItem(FILL_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        source?: string;
        filled?: Record<string, string>;
        dealId?: string;
      };
      setSource(parsed.source ?? "quote_sheets");
      setSheet(parsed.filled ?? {});
      setDealId(parsed.dealId ?? "");
    } catch {
      setSource("invalid");
    }
  }, []);

  const ready = Object.keys(sheet).length > 0;
  const covA = sheet.coverage_a ?? "";

  return (
    <section className="ff-card space-y-3 p-4">
      <div
        className={
          ready
            ? "rounded-md bg-fit-green-bg px-3 py-2 text-sm text-fit-green"
            : "rounded-md bg-fit-yellow-bg px-3 py-2 text-sm text-fit-yellow"
        }
      >
        {ready
          ? `Sheet ready · source ${source}${dealId ? ` · deal ${dealId}` : ""}${covA ? ` · Cov A ${covA}` : ""}. Chrome Fill reads this same packet.`
          : "Waiting for Send to Fill. Open a Deal Quote Sheet, approve if locked, then Send master sheet to Fill."}
      </div>
      <p className="text-helper text-muted-foreground">
        Free path only: desk Send to Fill → this window or the unpacked Chrome add-on in{" "}
        <code>extensions/fill</code>. No paid vendor. Username and password fields stay empty.
      </p>
      {FIELDS.map(([key, label]) => (
        <label key={key} className="mb-2 block text-sm">
          <span className="text-base text-muted-foreground">{label}</span>
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
