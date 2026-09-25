"use client";

import { useMemo, useState, useTransition } from "react";
import { updateContactElsewhereCoverage } from "@/app/actions/contacts-ops";
import { updateAccountElsewhereCoverage } from "@/app/actions/businesses-ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ELSEWHERE_LINE_OPTIONS,
  newElsewhereRow,
  parseElsewhereCoverage,
  serializeElsewhereCoverage,
} from "@/lib/coverage/elsewhere-coverage";
import { gapLineLabel } from "@/lib/coverage/gaps";
import type { ElsewhereCoverageRow } from "@/lib/db/schema";
import { flashAction } from "@/lib/flash-client";
import { cn } from "@/lib/utils";

/**
 * Agent-entered Elsewhere coverage rows (line / carrier / renewal / rough premium).
 * Shared Elsewhere editor for Contact and Account Coverage tabs.
 */
export function ElsewhereCoverageEditor({
  recordId,
  value,
  onChange,
  persist = true,
  party = "contact",
}: {
  recordId?: string;
  value: ElsewhereCoverageRow[] | string;
  onChange?: (next: ElsewhereCoverageRow[]) => void;
  /** When false, only updates local/parent state (form embed). */
  persist?: boolean;
  /** Persist target — Contact or Account Coverage Elsewhere. */
  party?: "contact" | "account";
}) {
  const initial = useMemo(
    () => (typeof value === "string" ? parseElsewhereCoverage(value) : parseElsewhereCoverage(value)),
    [value],
  );
  const [rows, setRows] = useState<ElsewhereCoverageRow[]>(initial);
  const [pending, start] = useTransition();

  function emit(next: ElsewhereCoverageRow[]) {
    setRows(next);
    onChange?.(next);
    if (!persist || !recordId) return;
    start(async () => {
      const result =
        party === "account"
          ? await updateAccountElsewhereCoverage({
              accountId: recordId,
              rows: next,
            })
          : await updateContactElsewhereCoverage({
              contactId: recordId,
              rows: next,
            });
      if (!result.ok) {
        flashAction(result.error ?? "Could Not Save", "error");
        setRows(initial);
        onChange?.(initial);
        return;
      }
      flashAction("Saved");
    });
  }

  return (
    <div
      className={cn("space-y-2", pending && "opacity-60")}
      data-ff-elsewhere-coverage=""
    >
      <input type="hidden" name="field_elsewhere_coverage" value={serializeElsewhereCoverage(rows)} />
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-ff-elsewhere-empty="">No coverage on file with another carrier.</p>
      ) : (
        <ul className="space-y-2" data-ff-elsewhere-list="">
          {rows.map((row, index) => (
            <li
              key={row.id}
              className="grid grid-cols-[1.1fr_1.2fr_1fr_1fr_auto] gap-2 items-end max-[720px]:grid-cols-1"
              data-ff-elsewhere-row={row.id}
            >
              <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold text-muted-foreground">
                Line
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={row.line}
                  aria-label="Line"
                  onChange={(e) => {
                    const next = [...rows];
                    next[index] = { ...row, line: e.target.value };
                    emit(next);
                  }}
                >
                  {ELSEWHERE_LINE_OPTIONS.map((line) => (
                    <option key={line} value={line}>
                      {gapLineLabel(line)}
                    </option>
                  ))}
                  {!ELSEWHERE_LINE_OPTIONS.includes(row.line as (typeof ELSEWHERE_LINE_OPTIONS)[number]) &&
                  row.line ? (
                    <option value={row.line}>{row.line}</option>
                  ) : null}
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold text-muted-foreground">
                Carrier
                <Input
                  value={row.carrier}
                  placeholder="Carrier name"
                  className="h-9"
                  aria-label="Carrier"
                  onChange={(e) => {
                    const next = [...rows];
                    next[index] = { ...row, carrier: e.target.value };
                    emit(next);
                  }}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold text-muted-foreground">
                Renewal date
                <Input
                  type="date"
                  value={row.renewalDate.slice(0, 10)}
                  className="h-9"
                  aria-label="Renewal date"
                  onChange={(e) => {
                    const next = [...rows];
                    next[index] = { ...row, renewalDate: e.target.value };
                    emit(next);
                  }}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold text-muted-foreground">
                Rough premium
                <Input
                  value={row.roughPremium}
                  placeholder="—"
                  className="h-9"
                  aria-label="Rough premium"
                  onChange={(e) => {
                    const next = [...rows];
                    next[index] = { ...row, roughPremium: e.target.value };
                    emit(next);
                  }}
                />
              </label>
              <Button
                type="button"
                variant="outline"
                className="h-9 w-9 shrink-0 px-0"
                aria-label="Remove elsewhere coverage"
                disabled={pending}
                onClick={() => emit(rows.filter((item) => item.id !== row.id))}
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="text-xs font-semibold text-primary"
        data-ff-elsewhere-add=""
        onClick={() => emit([...rows, newElsewhereRow()])}
      >
        + Add elsewhere coverage
      </button>
    </div>
  );
}
