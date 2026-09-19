"use client";

import Link from "next/link";
import { StagePill } from "@/components/fit-badge";
import { ColumnTable } from "@/components/lists/column-table";
import { PolicyQuickActions } from "@/components/policy/policy-quick-actions";
import { formatDay, formatMoney } from "@/lib/domain";
import {
  RENEWAL_QUEUE_STAGE_LABELS,
  isRenewalQueueStage,
} from "@/lib/domain-ams";
import { RENEWALS_LIST_COLUMNS } from "@/lib/list-columns";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";
import { haystack } from "@/lib/search/live-query";

function stageLabel(stage: string) {
  return isRenewalQueueStage(stage) ? RENEWAL_QUEUE_STAGE_LABELS[stage] : stage.replaceAll("_", " ");
}

function daysLabel(days: number) {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Expires today";
  return `${days}d`;
}

/** Renewals List — client ColumnTable (prefs via server actions). Activity beside policy name. */
export function RenewalsList({
  cards,
  initialQuery = "",
}: {
  cards: RenewalBoardCard[];
  initialQuery?: string;
}) {
  return (
    <ColumnTable
      moduleId="renewals-pipeline"
      searchModuleId="renewals-pipeline"
      initialQuery={initialQuery}
      columns={RENEWALS_LIST_COLUMNS}
      empty="No renewals match this filter."
      initialSort={{ key: "days", dir: "asc" }}
      rows={cards.map((card) => ({
        key: card.queueId,
        hay: haystack([
          card.displayName,
          card.policyNumber,
          card.clientName,
          card.lineOfBusiness,
          card.policySubType,
          card.carrierName,
          card.stage,
        ]),
        cells: {
          policy: (
            <div className="flex min-w-0 items-center gap-1">
              <Link
                href={`/policies/${card.policyId}`}
                className="min-w-0 truncate font-medium text-primary hover:underline"
                title={card.displayName}
              >
                {card.displayName}
              </Link>
              <PolicyQuickActions
                policyId={card.policyId}
                phone={card.phone}
                email={card.email}
                contactId={card.contactId}
                accountId={card.accountId}
              />
            </div>
          ),
          lob: card.lineOfBusiness,
          subtype: card.policySubType?.replaceAll("_", " ") || "—",
          carrier: card.carrierName,
          expires: formatDay(card.expirationDate),
          days: daysLabel(card.daysUntil),
          premium:
            card.premium != null && card.premium !== "" ? formatMoney(card.premium) : "—",
          stage: <StagePill stage={stageLabel(card.stage)} />,
          client: card.clientName || "—",
        },
        sort: {
          policy: card.displayName,
          lob: card.lineOfBusiness,
          subtype: card.policySubType ?? "",
          carrier: card.carrierName,
          expires: card.expirationDate
            ? new Date(card.expirationDate).getTime()
            : 0,
          days: card.daysUntil,
          premium: Number(card.premium) || 0,
          stage: card.stage,
          client: card.clientName,
        },
      }))}
    />
  );
}
