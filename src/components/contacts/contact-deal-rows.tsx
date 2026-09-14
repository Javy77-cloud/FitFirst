"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { RecordLink } from "@/components/record-links";
import { formatMoney } from "@/lib/domain";

type DealRow = {
  id: string;
  title: string;
  pipelineStage: string;
  coverageAmount?: number | null;
  lineOfBusiness?: string | null;
};

function Row({ deal }: { deal: DealRow }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-b border-border last:border-b-0" data-ff-contact-deal-row={deal.id}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
        <button
          type="button"
          className="text-left text-xs text-muted-foreground hover:text-[#002868]"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Collapse Deal" : "Expand Deal"}
        >
          {open ? "▾" : "▸"}
        </button>
        <RecordLink href={`/deals/${deal.id}`}>{deal.title}</RecordLink>
        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
          {deal.pipelineStage}
        </span>
        <span className="text-muted-foreground">
          {deal.coverageAmount != null ? formatMoney(deal.coverageAmount) : "—"}
        </span>
        {deal.lineOfBusiness ? (
          <span className="text-xs text-muted-foreground">{deal.lineOfBusiness}</span>
        ) : null}
      </div>
      {open ? (
        <div className="space-y-1 px-6 pb-2 text-xs text-muted-foreground">
          <div>Stage · {deal.pipelineStage || "—"}</div>
          <div>Line · {deal.lineOfBusiness || "—"}</div>
          <div>Coverage · {deal.coverageAmount != null ? formatMoney(deal.coverageAmount) : "—"}</div>
        </div>
      ) : null}
    </li>
  );
}

export function ContactDealRows({
  contactId,
  deals,
}: {
  contactId: string;
  deals: DealRow[];
}) {
  if (deals.length === 0) {
    return (
      <div
        className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
        data-ff-contact-deals-empty=""
      >
        <span>No Deals Yet — Add One.</span>
        <Link
          href={`/deals/new?contactId=${contactId}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-[#002868] hover:bg-muted"
          aria-label="Add Deal"
        >
          <Plus className="size-4" />
        </Link>
      </div>
    );
  }
  return (
    <ul data-ff-contact-deals="">
      {deals.map((deal) => (
        <Row key={deal.id} deal={deal} />
      ))}
    </ul>
  );
}
