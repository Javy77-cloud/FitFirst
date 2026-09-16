"use client";

import Link from "next/link";
import { archiveWonDeal } from "@/app/actions/pipeline";
import { DealRowActions } from "@/components/crm/deal-row-actions";
import { InsuredLink } from "@/components/crm/insured-link";
import { LinkedValue } from "@/components/crm/linked-value";
import { FieldSlot } from "@/components/pipeline/field-picker";
import { DealProductStageChips } from "@/components/deals/deal-product-stage-chips";
import { StagePill } from "@/components/fit-badge";
import { LINE_LABELS } from "@/lib/crm/bind";
import { formatIsoDate } from "@/lib/crm/display";
import { formatMoney } from "@/lib/domain";
import { isClosedWonStage } from "@/lib/wire/pipeline";
import type { DeskUserOption } from "@/lib/deals/transfer";
import { AssignRecordTags, type TagCatalogRow } from "@/components/tags/assign-record-tags";
import type { PipelineCardView } from "@/lib/wire/pipeline-cards";

export function PipelineDealCard({
  deal,
  stageName,
  stageColor,
  showArchive,
  agents = [],
  tagCatalog = [],
}: {
  deal: PipelineCardView;
  stageName?: string;
  stageColor?: string | null;
  showArchive?: boolean;
  agents?: DeskUserOption[];
  tagCatalog?: TagCatalogRow[];
}) {
  const line =
    LINE_LABELS[deal.lineOfBusiness as keyof typeof LINE_LABELS] ?? deal.lineOfBusiness;

  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/fitfirst-deal", deal.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      className="cursor-grab rounded-md border border-border bg-background p-2.5 active:cursor-grabbing"
    >
      <FieldSlot id="title">
        <Link href={`/deals/${deal.id}`} className="text-sm font-medium text-primary hover:underline">
          {deal.title}
        </Link>
      </FieldSlot>
      <FieldSlot id="insured" className="mt-1 text-[11px] text-navy">
        <InsuredLink href={deal.insuredHref} name={deal.insured} />
      </FieldSlot>
      <FieldSlot id="line" className="mt-1 text-[11px] text-muted-foreground">
        {line}
      </FieldSlot>
      <FieldSlot id="state" className="mt-0.5 text-[11px] text-muted-foreground">
        {deal.state}
      </FieldSlot>
      <FieldSlot id="city" className="mt-0.5 text-[11px] text-muted-foreground">
        {deal.city ?? "—"}
      </FieldSlot>
      <FieldSlot id="coverageA" className="mt-0.5 text-[11px] text-muted-foreground">
        {deal.coverageA != null ? formatMoney(deal.coverageA) : "—"}
      </FieldSlot>
      <FieldSlot id="carrier" className="mt-0.5 text-[11px] text-muted-foreground">
        {deal.carrier ?? "—"}
      </FieldSlot>
      <FieldSlot id="stage" className="mt-1">
        {deal.productStageChips.length > 0 ? (
          <DealProductStageChips chips={deal.productStageChips} />
        ) : (
          <StagePill stage={stageName ?? deal.pipelineStage} color={stageColor} />
        )}
      </FieldSlot>
      <FieldSlot id="address" className="mt-1 text-[11px]">
        <LinkedValue value={deal.address} />
      </FieldSlot>
      <FieldSlot id="phone" className="mt-1 text-[11px]">
        <LinkedValue value={deal.phone} kind="tel" />
      </FieldSlot>
      <FieldSlot id="email" className="mt-1 text-[11px]">
        <LinkedValue value={deal.email} kind="email" />
      </FieldSlot>
      <FieldSlot id="updated" className="mt-1 text-[11px] text-muted-foreground">
        Updated {deal.updatedAt ? formatIsoDate(new Date(deal.updatedAt)) : "—"}
      </FieldSlot>
      <FieldSlot id="bound" className="mt-0.5 text-[11px] text-muted-foreground">
        {deal.boundAt ? `Bound ${formatIsoDate(new Date(deal.boundAt))}` : "Unbound"}
      </FieldSlot>
      <FieldSlot id="tags" className="mt-1">
        <AssignRecordTags module="deals" recordId={deal.id} tags={deal.tags} catalog={tagCatalog} />
      </FieldSlot>
      <div className="mt-2">
        <DealRowActions
          dealId={deal.id}
          phone={deal.phone}
          email={deal.email}
          homeAddress={deal.address}
          contactId={deal.contactId}
          accountId={deal.accountId}
          leadId={deal.leadId}
          ownerId={deal.ownerId}
          users={agents}
        />
      </div>
      {showArchive && isClosedWonStage(deal.pipelineStageSlug ?? deal.pipelineStage) ? (
        <form action={archiveWonDeal} className="mt-2">
          <input type="hidden" name="dealId" value={deal.id} />
          <button type="submit" className="text-[11px] text-primary hover:underline">
            Archive deal
          </button>
        </form>
      ) : null}
    </article>
  );
}
