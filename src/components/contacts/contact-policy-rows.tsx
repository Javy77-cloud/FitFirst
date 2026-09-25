"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { RecordLink } from "@/components/record-links";
import { formatDay, formatMoney } from "@/lib/domain";
import {
  policyCoApplicantLabel,
  type PolicyCoApplicantLink,
} from "@/lib/contacts/policy-co-applicants";
import { policyFormProductLabel } from "@/lib/policy/form-label";

type PolicyRow = {
  id: string;
  policyNumber: string;
  status: string;
  premium: string | number | null;
  renewalDate: Date | string | null;
  expirationDate: Date | string | null;
  lineOfBusiness: string;
  policyType?: string | null;
  policySubType?: string | null;
  formType?: string | null;
  carrierName?: string | null;
  dealId?: string | null;
  dealTitle?: string | null;
};

function Row({ row }: { row: PolicyRow }) {
  const [open, setOpen] = useState(false);
  const renewal = row.renewalDate ?? row.expirationDate;
  const product = policyFormProductLabel(row);
  return (
    <li className="border-b border-border last:border-b-0" data-ff-contact-policy-row={row.id}>
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
        {product ? (
          <span className="text-xs text-muted-foreground">{product}</span>
        ) : null}
      </div>
      {open ? (
        <div className="space-y-1 px-6 pb-2 text-xs text-muted-foreground">
          <div>Type · {product || "—"}</div>
          <div>Expires · {formatDay(row.expirationDate)}</div>
          {row.dealId ? (
            <div>
              Deal · <RecordLink href={`/deals/${row.dealId}`}>{row.dealTitle ?? "Deal"}</RecordLink>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function CoApplicantReverseLookup({ links }: { links: PolicyCoApplicantLink[] }) {
  if (links.length === 0) return null;
  // Group by relation label
  const applied = links.filter((l) => l.relation === "co-applied-with");
  const applies = links.filter((l) => l.relation === "co-applies-with");
  return (
    <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm" data-ff-policy-coapplicant-lookup="">
      {applied.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-muted-foreground">{policyCoApplicantLabel("co-applied-with")}</span>
          {applied.map((row, i) => (
            <span key={row.contactId} className="inline-flex items-center gap-1">
              {i > 0 ? <span className="text-muted-foreground">·</span> : null}
              <Link
                href={`/contacts/${row.contactId}`}
                className="font-medium text-[#002868] hover:underline"
                data-ff-policy-coapplicant-link=""
              >
                {row.lastName}, {row.firstName}
              </Link>
            </span>
          ))}
        </div>
      ) : null}
      {applies.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-muted-foreground">{policyCoApplicantLabel("co-applies-with")}</span>
          {applies.map((row, i) => (
            <span key={row.contactId} className="inline-flex items-center gap-1">
              {i > 0 ? <span className="text-muted-foreground">·</span> : null}
              <Link
                href={`/contacts/${row.contactId}`}
                className="font-medium text-[#002868] hover:underline"
                data-ff-policy-coapplicant-link=""
              >
                {row.lastName}, {row.firstName}
              </Link>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ContactPolicyRows({
  contactId,
  policies,
  coApplicantLinks = [],
}: {
  contactId: string;
  policies: PolicyRow[];
  coApplicantLinks?: PolicyCoApplicantLink[];
}) {
  if (policies.length === 0) {
    return (
      <div data-ff-contact-policies-empty="">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>No Policies Yet — Add One.</span>
          <Link
            href={`/policies/new?contactId=${contactId}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-[#002868] hover:bg-muted"
            aria-label="Add Policy"
          >
            <Plus className="size-4" />
          </Link>
        </div>
        <CoApplicantReverseLookup links={coApplicantLinks} />
      </div>
    );
  }
  return (
    <div>
      <ul data-ff-contact-policies="">
        {policies.map((row) => (
          <Row key={row.id} row={row} />
        ))}
      </ul>
      <CoApplicantReverseLookup links={coApplicantLinks} />
    </div>
  );
}
