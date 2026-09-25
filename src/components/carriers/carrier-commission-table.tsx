"use client";

import { useState, useTransition } from "react";
import { updateCarrierField } from "@/app/actions/carriers-ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { flashAction } from "@/lib/flash-client";
import type { CommissionScheduleRow } from "@/lib/carriers/commission";

export function CarrierCommissionTable({
  carrierId,
  rows,
  admin,
}: {
  carrierId: string;
  rows: CommissionScheduleRow[];
  admin: boolean;
}) {
  const [draft, setDraft] = useState<CommissionScheduleRow[]>(
    rows.length
      ? rows
      : [{ lob: "", newBusinessPct: "", renewalPct: "", bonusThresholds: "" }],
  );
  const [pending, startTransition] = useTransition();

  function updateRow(index: number, patch: Partial<CommissionScheduleRow>) {
    setDraft((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setDraft((prev) => [
      ...prev,
      { lob: "", newBusinessPct: "", renewalPct: "", bonusThresholds: "" },
    ]);
  }

  function removeRow(index: number) {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  }

  function save() {
    startTransition(async () => {
      const result = await updateCarrierField({
        carrierId,
        fieldKey: "commission_schedule",
        value: JSON.stringify(draft),
      });
      if (!result.ok) {
        flashAction(result.error ?? "Could Not Save", "error");
        return;
      }
      flashAction("Commission schedule saved");
    });
  }

  return (
    <div className="space-y-3" data-ff-carrier-commission="">
      <div className="overflow-x-auto">
        <table className="ff-table text-sm">
          <thead>
            <tr>
              <th>LOB</th>
              <th>New business %</th>
              <th>Renewal %</th>
              <th>Bonus thresholds</th>
              {admin ? <th /> : null}
            </tr>
          </thead>
          <tbody>
            {draft.length === 0 ? (
              <tr>
                <td colSpan={admin ? 5 : 4} className="py-4 text-muted-foreground">
                  No commission rows yet.
                </td>
              </tr>
            ) : (
              draft.map((row, index) => (
                <tr key={index}>
                  <td>
                    {admin ? (
                      <Input
                        className="h-8"
                        value={row.lob}
                        onChange={(e) => updateRow(index, { lob: e.target.value })}
                      />
                    ) : (
                      row.lob || "—"
                    )}
                  </td>
                  <td>
                    {admin ? (
                      <Input
                        className="h-8"
                        value={row.newBusinessPct}
                        onChange={(e) => updateRow(index, { newBusinessPct: e.target.value })}
                      />
                    ) : (
                      row.newBusinessPct || "—"
                    )}
                  </td>
                  <td>
                    {admin ? (
                      <Input
                        className="h-8"
                        value={row.renewalPct}
                        onChange={(e) => updateRow(index, { renewalPct: e.target.value })}
                      />
                    ) : (
                      row.renewalPct || "—"
                    )}
                  </td>
                  <td>
                    {admin ? (
                      <Input
                        className="h-8"
                        value={row.bonusThresholds}
                        onChange={(e) => updateRow(index, { bonusThresholds: e.target.value })}
                      />
                    ) : (
                      row.bonusThresholds || "—"
                    )}
                  </td>
                  {admin ? (
                    <td>
                      <Button type="button" size="xs" variant="ghost" onClick={() => removeRow(index)}>
                        Remove
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {admin ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={addRow}>
            Add row
          </Button>
          <Button type="button" size="sm" disabled={pending} onClick={save}>
            Save schedule
          </Button>
        </div>
      ) : null}
    </div>
  );
}
