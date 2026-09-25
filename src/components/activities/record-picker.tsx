"use client";

import { ProcessingLabel } from "@/components/desk/wait-hold";

import { useEffect, useState } from "react";
import { searchActivityRecords } from "@/app/actions/activity-records";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActivityRecordHit } from "@/lib/activities/record-picker";

export function ActivityRecordPicker({
  onPick,
}: {
  onPick: (hit: ActivityRecordHit) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ActivityRecordHit[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      setBusy(true);
      void searchActivityRecords(q)
        .then((rows) => setHits(rows))
        .finally(() => setBusy(false));
    }, 180);
    return () => window.clearTimeout(handle);
  }, [query]);

  return (
    <div data-testid="activity-record-picker">
      <Label className="text-xs">Find a record</Label>
      <Input
        className="mt-1 h-8"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search leads, deals, or contacts"
        autoComplete="off"
        aria-label="Search leads, deals, or contacts"
      />
      {busy ? <p className="mt-1 text-[11px] text-muted-foreground"><ProcessingLabel>Searching…</ProcessingLabel></p> : null}
      {hits.length > 0 ? (
        <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto rounded-md border border-border bg-card p-1">
          {hits.map((hit) => (
            <li key={`${hit.kind}-${hit.id}`}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted"
                onClick={() => {
                  onPick(hit);
                  setQuery(hit.name);
                  setHits([]);
                }}
              >
                <span>
                  <span className="font-medium text-navy">{hit.name}</span>
                  <span className="ml-2 text-muted-foreground">
                    {[hit.phone, hit.email].filter(Boolean).join(" · ") || "No phone or email"}
                  </span>
                </span>
                <span className="shrink-0 uppercase text-[10px] text-muted-foreground">{hit.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim().length >= 2 && !busy ? (
        <p className="mt-1 text-[11px] text-muted-foreground">No match. Type a name, phone, or email by hand.</p>
      ) : null}
    </div>
  );
}
