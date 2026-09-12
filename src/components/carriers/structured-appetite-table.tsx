"use client";

import { useState, useTransition } from "react";
import { saveCarrierAppetiteRows } from "@/app/actions/carriers-ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  emptyAppetiteRow,
  type AppetiteNoteRow,
} from "@/lib/carriers/appetite-rows";
import { LINES } from "@/lib/domain";
import { flashAction } from "@/lib/flash-client";

const LOB_OPTIONS = ["HO", "DP", "AUTO", "FLOOD", "UMBRELLA", "GL", "BOP", "LIFE", "RV", "WC", "HEALTH", ...LINES.filter((l) => !["HO","AUTO","FLOOD","UMBRELLA","GL","BOP","LIFE","RV","WC","HEALTH"].includes(l))];

export function StructuredAppetiteTable({
  carrierId,
  rows: initial,
  admin,
}: {
  carrierId: string;
  rows: AppetiteNoteRow[];
  admin: boolean;
}) {
  const [rows, setRows] = useState<AppetiteNoteRow[]>(
    initial.length ? initial : admin ? [emptyAppetiteRow()] : [],
  );
  const [pending, startTransition] = useTransition();

  function update(id: string, patch: Partial<AppetiteNoteRow>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyAppetiteRow()]);
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  function save() {
    startTransition(async () => {
      const result = await saveCarrierAppetiteRows({ carrierId, rows });
      if (!result.ok) {
        flashAction(result.error, "error");
        return;
      }
      setRows(result.rows.length ? result.rows : admin ? [emptyAppetiteRow()] : []);
      flashAction("Appetite Rows Saved");
    });
  }

  if (!admin) {
    if (rows.length === 0) {
      return <p className="text-sm text-muted-foreground">No Appetite Rows Yet.</p>;
    }
    return (
      <div className="overflow-x-auto" data-ff-carrier-appetite-rows="">
        <table className="w-full min-w-[56rem] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-[#002868]">
              <th className="px-1 py-1">Date Requested</th>
              <th className="px-1 py-1">LOB</th>
              <th className="px-1 py-1">Roof Age</th>
              <th className="px-1 py-1">Water Heater</th>
              <th className="px-1 py-1">HVAC</th>
              <th className="px-1 py-1">Electrical</th>
              <th className="px-1 py-1">Claims History</th>
              <th className="px-1 py-1">Accept/Decline</th>
              <th className="px-1 py-1">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60">
                <td className="px-1 py-1">{row.dateRequested || "—"}</td>
                <td className="px-1 py-1">{row.lob || "—"}</td>
                <td className="px-1 py-1">{row.roofAge || "—"}</td>
                <td className="px-1 py-1">{row.waterHeater || "—"}</td>
                <td className="px-1 py-1">{row.hvac || "—"}</td>
                <td className="px-1 py-1">{row.electrical || "—"}</td>
                <td className="px-1 py-1">{row.claimsHistory || "—"}</td>
                <td className="px-1 py-1 capitalize">{row.acceptDecline || "—"}</td>
                <td className="px-1 py-1">{row.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-ff-carrier-appetite-rows="">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-[#002868]">
              <th className="px-1 py-1">Date Requested</th>
              <th className="px-1 py-1">LOB</th>
              <th className="px-1 py-1">Roof Age</th>
              <th className="px-1 py-1">Water Heater</th>
              <th className="px-1 py-1">HVAC</th>
              <th className="px-1 py-1">Electrical</th>
              <th className="px-1 py-1">Claims History</th>
              <th className="px-1 py-1">Accept/Decline</th>
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
                    value={row.dateRequested}
                    onChange={(e) => update(row.id, { dateRequested: e.target.value })}
                  />
                </td>
                <td className="px-1 py-1">
                  <select
                    className="h-7 w-24 rounded-md border border-input bg-background px-1 text-xs"
                    value={row.lob}
                    onChange={(e) => update(row.id, { lob: e.target.value })}
                  >
                    <option value="">—</option>
                    {[...new Set(LOB_OPTIONS)].map((lob) => (
                      <option key={lob} value={lob}>
                        {lob}
                      </option>
                    ))}
                  </select>
                </td>
                {(
                  [
                    ["roofAge", row.roofAge],
                    ["waterHeater", row.waterHeater],
                    ["hvac", row.hvac],
                    ["electrical", row.electrical],
                    ["claimsHistory", row.claimsHistory],
                  ] as const
                ).map(([key, value]) => (
                  <td key={key} className="px-1 py-1">
                    <Input
                      className="h-7 text-xs"
                      value={value}
                      onChange={(e) => update(row.id, { [key]: e.target.value })}
                    />
                  </td>
                ))}
                <td className="px-1 py-1">
                  <select
                    className="h-7 w-24 rounded-md border border-input bg-background px-1 text-xs"
                    value={row.acceptDecline}
                    onChange={(e) =>
                      update(row.id, {
                        acceptDecline: e.target.value as AppetiteNoteRow["acceptDecline"],
                      })
                    }
                  >
                    <option value="">—</option>
                    <option value="accept">Accept</option>
                    <option value="decline">Decline</option>
                  </select>
                </td>
                <td className="px-1 py-1">
                  <Input
                    className="h-7 text-xs"
                    value={row.notes}
                    onChange={(e) => update(row.id, { notes: e.target.value })}
                  />
                </td>
                <td className="px-1 py-1">
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => removeRow(row.id)}>
                    ✕
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          Add Row
        </Button>
        <Button
          type="button"
          size="sm"
          className="bg-[#002868] text-white hover:bg-[#002868]/90"
          disabled={pending}
          onClick={save}
        >
          {pending ? "Saving…" : "Save Appetite Rows"}
        </Button>
      </div>
    </div>
  );
}
