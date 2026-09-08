"use client";

import { useMemo, useState, useTransition } from "react";
import { clearDealMarketsAction, removeSelectedMarketsAction } from "@/app/actions/deal-desk";
import { FitBadge } from "@/components/fit-badge";
import { Button } from "@/components/ui/button";
import type { CarrierMatch } from "@/lib/appetite/match";
import { appointmentLabel, isAppointedMatch } from "@/lib/appetite/present";
import { confirmHardDelete } from "@/lib/desk/confirm-hard-delete";
import { asList } from "@/lib/safe-list";

export function MarketsSelectTable({
  dealId,
  title,
  rows,
  manualIds,
}: {
  dealId: string;
  title: string;
  rows: CarrierMatch[];
  manualIds: Set<string>;
}) {
  const list = asList(rows);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const ids = useMemo(() => list.map((row) => row.carrierId), [list]);
  const allOn = ids.length > 0 && ids.every((id) => selected.includes(id));

  function toggle(id: string, on: boolean) {
    setSelected((current) => (on ? [...new Set([...current, id])] : current.filter((x) => x !== id)));
  }

  function onRemove() {
    if (!selected.length) return;
    const subject =
      selected.length === 1 ? "this carrier from Markets" : `these ${selected.length} carriers from Markets`;
    if (!confirmHardDelete(subject)) return;
    const data = new FormData();
    data.set("dealId", dealId);
    for (const id of selected) data.append("carrierId", id);
    startTransition(async () => {
      await removeSelectedMarketsAction(data);
    });
  }

  return (
    <section className="ff-card overflow-hidden" data-ff-markets-select="">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div className="text-base font-semibold text-navy">{title}</div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!selected.length || pending}
          onClick={onRemove}
          data-ff-markets-remove-selected=""
        >
          {pending ? "Removing…" : `Remove selected${selected.length ? ` (${selected.length})` : ""}`}
        </Button>
      </div>
      <table className="ff-table">
        <thead>
          <tr>
            <th>Carrier</th>
            <th>Appointment</th>
            <th>Fit</th>
            <th>Score</th>
            <th>Why</th>
            <th className="w-12 text-center">
              <input
                type="checkbox"
                aria-label={`Select all ${title}`}
                checked={allOn}
                onChange={(event) => setSelected(event.target.checked ? [...ids] : [])}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {list.map((row) => (
            <tr key={row.carrierId}>
              <td className="font-medium">
                {row.carrierName}
                {manualIds.has(row.carrierId) ? (
                  <span className="ml-2 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-navy">
                    manual
                  </span>
                ) : null}
                {row.learnedDecline ? (
                  <div className="text-helper text-fit-red">Learned from decline log</div>
                ) : null}
              </td>
              <td>{appointmentLabel(row)}</td>
              <td>
                <FitBadge band={row.band} />
              </td>
              <td>{row.fitScore}</td>
              <td className="text-xs">
                {asList(row.reasons)
                  .filter((r) => r.severity !== "pass")
                  .map((r) => r.message)
                  .join(" · ") || "Clears structured appetite."}
              </td>
              <td className="text-center">
                <input
                  type="checkbox"
                  aria-label={`Select ${row.carrierName}`}
                  checked={selected.includes(row.carrierId)}
                  onChange={(event) => toggle(row.carrierId, event.target.checked)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function ClearDealMarketsButton({ dealId }: { dealId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      data-ff-markets-clear=""
      onClick={() => {
        if (!confirmHardDelete("the whole Markets list on this deal")) return;
        const data = new FormData();
        data.set("dealId", dealId);
        startTransition(async () => {
          await clearDealMarketsAction(data);
        });
      }}
    >
      {pending ? "Clearing…" : "Clear Markets list"}
    </Button>
  );
}
