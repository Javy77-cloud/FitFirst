"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { RecordLink } from "@/components/record-links";
import { formatDay, formatMoney } from "@/lib/domain";

type PolicyRow = {
  id: string;
  policyNumber: string;
  status: string;
  premium: string | number | null;
  renewalDate: Date | string | null;
  expirationDate: Date | string | null;
  lineOfBusiness: string;
  carrierName?: string | null;
  certifiable?: boolean;
  /** Policy reverse-lookup only — never a manual Business co-app field. */
  coAppliesWith?: { id: string; label: string } | null;
};

function Row({ row }: { row: PolicyRow }) {
  const [open, setOpen] = useState(false);
  const renewal = row.renewalDate ?? row.expirationDate;
  return (
    <li className="border-b border-border last:border-b-0" data-ff-business-policy-row={row.id}>
      <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-1 py-2 text-sm">
        <button
          type="button"
          className="text-left text-xs text-muted-foreground hover:text-[#002868]"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Collapse Policy" : "Expand Policy"}
        >
          {open ? "▾" : "▸"}
        </button>
        <RecordLink href={`/policies/${row.id}`}>{row.policyNumber}</RecordLink>
        <PolicyStatusBadge status={row.status} />
        <span className="text-muted-foreground">{formatMoney(row.premium)}</span>
        <span className="text-xs text-muted-foreground">Renewal {formatDay(renewal)}</span>
        {row.carrierName ? (
          <span className="text-xs text-muted-foreground">{row.carrierName}</span>
        ) : null}
        {row.certifiable ? (
          <Link
            href={`/policies/${row.id}`}
            className="text-xs font-semibold text-[#002868] hover:underline"
            data-ff-view-coi=""
          >
            View COI
          </Link>
        ) : null}
      </div>
      {open ? (
        <div className="space-y-1 px-6 pb-2 text-xs text-muted-foreground">
          <div>Type · {row.lineOfBusiness || "—"}</div>
          <div>Expires · {formatDay(row.expirationDate)}</div>
          {row.coAppliesWith ? (
            <div data-ff-policy-coapplies="">
              Co-Applies With:{" "}
              <RecordLink href={`/contacts/${row.coAppliesWith.id}`}>
                {row.coAppliesWith.label}
              </RecordLink>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function BusinessPolicyRows({
  accountId,
  policies,
}: {
  accountId: string;
  policies: PolicyRow[];
}) {
  if (policies.length === 0) {
    return (
      <div
        className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
        data-ff-business-policies-empty=""
      >
        <span>No Commercial Policies Yet — Add One.</span>
        <Link
          href={`/policies/new?accountId=${accountId}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-[#002868] hover:bg-muted"
          aria-label="Add Policy"
        >
          <Plus className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <ul data-ff-business-policies="">
      {policies.map((row) => (
        <Row key={row.id} row={row} />
      ))}
    </ul>
  );
}
