"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  groupChecklistAttention,
  type AttentionGroupInput,
  type GroupedAttentionRow,
} from "@/lib/work-queue/attention-group";

function SingleRow({ item }: { item: AttentionGroupInput }) {
  return (
    <tr data-ff-attention-row={item.id}>
      <td>
        <span className="uppercase">{item.kind.replaceAll("_", " ")}</span>
      </td>
      <td>
        <Link href={item.href} className="font-medium text-primary hover:underline">
          {item.title}
        </Link>
      </td>
      <td>
        <span className="text-base text-muted-foreground">{item.detail}</span>
      </td>
    </tr>
  );
}

function GroupRow({
  row,
  open,
  onToggle,
}: {
  row: Extract<GroupedAttentionRow, { kind: "checklist_group" }>;
  open: boolean;
  onToggle: () => void;
}) {
  const sample = row.samplePolicies.join(", ");
  return (
    <>
      <tr data-ff-attention-group={row.id} className="bg-secondary/30">
        <td>
          <span className="uppercase">checklist</span>
        </td>
        <td>
          <button
            type="button"
            className="text-left font-medium text-primary hover:underline"
            aria-expanded={open}
            onClick={onToggle}
            data-testid="attention-group-toggle"
          >
            {row.itemType}{" "}
            <span className="text-muted-foreground">
              · {row.count} open{open ? " ▾" : " ▸"}
            </span>
          </button>
          {!open && sample ? (
            <div className="mt-0.5 text-sm text-muted-foreground">
              e.g. {sample}
              {row.count > row.samplePolicies.length ? "…" : ""}
            </div>
          ) : null}
        </td>
        <td>

        </td>
      </tr>
      {open
        ? row.items.map((item) => (
            <tr key={item.id} data-ff-attention-row={item.id} className="bg-card">
              <td>
                <span className="pl-3 uppercase text-muted-foreground">
                  {item.kind.replaceAll("_", " ")}
                </span>
              </td>
              <td>
                <Link href={item.href} className="font-medium text-primary hover:underline">
                  {item.title}
                </Link>
              </td>
              <td>
                <span className="text-base text-muted-foreground">{item.detail}</span>
              </td>
            </tr>
          ))
        : null}
    </>
  );
}

/**
 * Soft-refresh ready: groups recomputed from the latest attention list on each
 * navigation / router.refresh(); expand state stays client-side.
 */
export function GroupedAttentionTable({ items }: { items: AttentionGroupInput[] }) {
  const grouped = useMemo(() => groupChecklistAttention(items), [items]);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  if (grouped.length === 0) {
    return (
      <p className="px-4 py-6 text-base text-muted-foreground" data-ff-attention-empty="">
        Queue is clear.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto" data-ff-grouped-attention="">
      <table className="ff-table">
        <thead>
          <tr>
            <th>Kind</th>
            <th>Item</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map((row) => {
            if (row.kind === "single") {
              return <SingleRow key={row.item.id} item={row.item} />;
            }
            const open = Boolean(openIds[row.id]);
            return (
              <GroupRow
                key={row.id}
                row={row}
                open={open}
                onToggle={() =>
                  setOpenIds((prev) => ({ ...prev, [row.id]: !prev[row.id] }))
                }
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
