"use client";

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

export function BusinessDealRows({
  accountId,
  deals,
}: {
  accountId: string;
  deals: DealRow[];
}) {
  if (deals.length === 0) {
    return (
      <div
        className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
        data-ff-business-deals-empty=""
      >
        <span>No Deals Yet — Add One.</span>
        <Link
          href={`/deals/new?accountId=${accountId}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-[#002868] hover:bg-muted"
          aria-label="Add Deal"
        >
          <Plus className="size-4" />
        </Link>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border" data-ff-business-deals="">
      {deals.map((deal) => (
        <li key={deal.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
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
        </li>
      ))}
    </ul>
  );
}
