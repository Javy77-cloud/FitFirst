"use client";

import { ProcessingLabel } from "@/components/desk/wait-hold";

import { useState, useTransition } from "react";
import { saveCarrierDontWriteRows } from "@/app/actions/carriers-ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  emptyDontWriteRow,
  type DontWriteNoteRow,
} from "@/lib/carriers/appetite-rows";
import { LINES } from "@/lib/domain";
import { commercialLineMenuOptions } from "@/lib/policy/eo";
import { flashAction } from "@/lib/flash-client";

const LOB_OPTIONS = ["HO", "DP", "AUTO", "FLOOD", "UMBRELLA", "GL", "BOP", "LIFE", "RV", "WC", "HEALTH", ...LINES];

export function StructuredDontWriteTable({
  carrierId,
  rows: initial,
  admin,
}: {
  carrierId: string;
  rows: DontWriteNoteRow[];
  admin: boolean;
}) {
  const [rows, setRows] = useState<DontWriteNoteRow[]>(
    initial.length ? initial : admin ? [emptyDontWriteRow()] : [],
  );
  const [pending, startTransition] = useTransition();

  function update(id: string, patch: Partial<DontWriteNoteRow>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function save() {
    startTransition(async () => {
      const result = await saveCarrierDontWriteRows({ carrierId, rows });
      if (!result.ok) {
        flashAction(result.error, "error");
        return;
      }
      setRows(result.rows.length ? result.rows : admin ? [emptyDontWriteRow()] : []);
      flashAction("Don't Write Rows Saved");
    });
  }

  if (!admin) {
    if (rows.length === 0) {
      return <p className="text-sm text-muted-foreground">No Don&apos;t Write Rows Yet.</p>;
    }
    return (
      <div className="overflow-x-auto" data-ff-carrier-dont-write-rows="">
        <table className="w-full min-w-[36rem] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-[#BF0A30]">
              <th className="px-1 py-1">Date</th>
              <th className="px-1 py-1">LOB</th>
              <th className="px-1 py-1">Decline Reason</th>
              <th className="px-1 py-1">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60">
                <td className="px-1 py-1">{row.date || "—"}</td>
                <td className="px-1 py-1">{row.lob || "—"}</td>
                <td className="px-1 py-1">{row.reason || "—"}</td>
                <td className="px-1 py-1">{row.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-ff-carrier-dont-write-rows="">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-[#BF0A30]">
              <th className="px-1 py-1">Date</th>
              <th className="px-1 py-1">LOB</th>
              <th className="px-1 py-1">Decline Reason</th>
              <th className="px-1 py-1">Notes</th>
              <th className="px-1 py-1" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60 align-top">
                <td className="px-1 py-1">
                  <Input
                    type="date"
                    className="h-7 text-xs"
                    value={row.date}
                    onChange={(e) => update(row.id, { date: e.target.value })}
                  />
                </td>
                <td className="px-1 py-1">
                  <select
                    className="h-7 w-24 rounded-md border border-input bg-background px-1 text-xs"
                    value={row.lob}
                    onChange={(e) => update(row.id, { lob: e.target.value })}
                  >
                    <option value="">—</option>
                    {commercialLineMenuOptions([...new Set(LOB_OPTIONS)], (lob) => lob).map((lob) => (
                      <option key={lob.value} value={lob.value} title={lob.title}>
                        {lob.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <Input
                    className="h-7 text-xs"
                    value={row.reason}
                    onChange={(e) => update(row.id, { reason: e.target.value })}
                    placeholder="Decline reason"
                  />
                </td>
                <td className="px-1 py-1">
                  <Input
                    className="h-7 text-xs"
                    value={row.notes}
                    onChange={(e) => update(row.id, { notes: e.target.value })}
                  />
                </td>
                <td className="px-1 py-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
                  >
                    ✕
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRows((prev) => [...prev, emptyDontWriteRow()])}
        >
          Add Row
        </Button>
        <Button
          type="button"
          size="sm"
          className="bg-[#BF0A30] text-white hover:bg-[#BF0A30]/90"
          disabled={pending}
          onClick={save}
        >
          {pending ? <ProcessingLabel>Saving…</ProcessingLabel> : "Save Don't Write Rows"}
        </Button>
      </div>
    </div>
  );
}
