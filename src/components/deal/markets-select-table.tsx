"use client";

import { useMemo, useTransition, type ReactNode } from "react";
import { clearDealMarketsAction, removeSelectedMarketsAction } from "@/app/actions/deal-desk";
import { FitBadge } from "@/components/fit-badge";
import { Button } from "@/components/ui/button";
import type { CarrierMatch } from "@/lib/appetite/match";
import { appointmentLabel } from "@/lib/appetite/present";
import { confirmHardDelete } from "@/lib/desk/confirm-hard-delete";
import { asList } from "@/lib/safe-list";

function MarketCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md hover:bg-muted/60">
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 accent-primary"
      />
    </label>
  );
}

export function MarketsSelectTable({
  dealId,
  title,
  rows,
  manualIds,
  selected: selectedProp,
  onSelectedChange,
  toolbar,
}: {
  dealId: string;
  title: string;
  rows: CarrierMatch[];
  manualIds: Set<string>;
  selected?: string[];
  onSelectedChange?: (next: string[]) => void;
  toolbar?: ReactNode;
}) {
  const list = asList(rows);
  const selected = Array.isArray(selectedProp) ? selectedProp : [];
  const [pending, startTransition] = useTransition();
  const ids = useMemo(() => list.map((row) => row.carrierId), [list]);
  const rowSelected = useMemo(() => selected.filter((id) => ids.includes(id)), [selected, ids]);
  const allOn = ids.length > 0 && ids.every((id) => selected.includes(id));

  function toggle(id: string, on: boolean) {
    const next = on ? [...new Set([...selected, id])] : selected.filter((x) => x !== id);
    onSelectedChange?.(next);
  }

  function toggleAll(on: boolean) {
    if (on) {
      onSelectedChange?.([...new Set([...selected, ...ids])]);
    } else {
      const drop = new Set(ids);
      onSelectedChange?.(selected.filter((id) => !drop.has(id)));
    }
  }

  function onRemove() {
    if (!rowSelected.length) return;
    const subject =
      rowSelected.length === 1
        ? "this carrier from Markets"
        : `these ${rowSelected.length} carriers from Markets`;
    if (!confirmHardDelete(subject)) return;
    const data = new FormData();
    data.set("dealId", dealId);
    for (const id of rowSelected) data.append("carrierId", id);
    startTransition(async () => {
      await removeSelectedMarketsAction(data);
      const drop = new Set(rowSelected);
      onSelectedChange?.(selected.filter((id) => !drop.has(id)));
    });
  }

  return (
    <section className="ff-card overflow-hidden" data-ff-markets-select="">
      {toolbar ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2"
          data-ff-deal-markets-stats=""
        >
          {toolbar}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div className="text-base font-semibold text-navy">{title}</div>
        <Button
          type="button"
          size="sm"
          variant="default"
          disabled={!rowSelected.length || pending}
          onClick={onRemove}
          data-ff-markets-remove-selected=""
          className="border border-fit-flag bg-fit-flag-bg text-fit-flag shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-fit-flag hover:text-white hover:border-fit-flag hover:shadow-md active:translate-y-0 disabled:opacity-45"
        >
          {pending ? "Removing…" : `Remove selected${rowSelected.length ? ` (${rowSelected.length})` : ""}`}
        </Button>
      </div>
      <table className="ff-table">
        <thead>
          <tr>
            <th>Carrier</th>
            <th>Appointment</th>
            <th>Appetite</th>
            <th className="w-12 text-center">
              <MarketCheckbox
                checked={allOn}
                onChange={toggleAll}
                label={`Select all ${title}`}
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
              </td>
              <td>{appointmentLabel(row)}</td>
              <td>
                <div className="flex items-center gap-2" data-ff-market-appetite="">
                  <FitBadge band={row.band} />
                  <span className="tabular-nums text-sm text-muted-foreground">{row.fitScore}</span>
                </div>
              </td>
              <td className="text-center">
                <MarketCheckbox
                  checked={selected.includes(row.carrierId)}
                  onChange={(on) => toggle(row.carrierId, on)}
                  label={`Select ${row.carrierName}`}
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
