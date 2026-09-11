"use client";

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
};

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
    <ul className="divide-y divide-border" data-ff-business-policies="">
      {policies.map((row) => {
        const renewal = row.renewalDate ?? row.expirationDate;
        return (
          <li
            key={row.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm"
            data-ff-business-policy-row={row.id}
          >
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
          </li>
        );
      })}
    </ul>
  );
}
