"use client";

import Link from "next/link";
import { ColumnTable, type ColumnRow } from "@/components/lists/column-table";
import { formatPremiumColumn } from "@/lib/deals/card-glance";
import { formatSignedMoney } from "@/lib/renewal/compare";
import { renewalPolicyTypeLabel } from "@/lib/renewal/policy-type";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";
import { RENEWAL_URGENCY_META, renewalUrgencyBand, renewalWhyLine } from "@/lib/renewal/urgency";
import type { ListColumn } from "@/lib/list-columns";

export const RENEWALS_HOST_LIST_COLUMNS: ListColumn[] = [
  { id: "client", label: "Client", locked: true, liveSearch: true },
  { id: "lob", label: "Policy type" },
  { id: "carrier", label: "Carrier" },
  { id: "premium", label: "Premium" },
  { id: "delta", label: "Change" },
  { id: "days", label: "Days out" },
  { id: "band", label: "Urgency" },
  { id: "why", label: "Why" },
  { id: "health", label: "Health", defaultOn: false },
  { id: "policy", label: "Policy #", defaultOn: false },
];

export function RenewalsHostList({ cards }: { cards: RenewalBoardCard[] }) {
  const rows: ColumnRow[] = cards.map((card) => {
    const band = renewalUrgencyBand(card.daysUntil);
    const lob = renewalPolicyTypeLabel(card);
    const why =
      card.why ||
      renewalWhyLine({
        daysUntil: card.daysUntil,
        premiumDelta: card.premiumDelta,
        whyExtra: card.whyExtra,
      });
    return {
      key: card.queueId,
      id: card.policyId,
      hay: `${card.clientName} ${card.policyNumber} ${lob} ${card.carrierName} ${why}`,
      sort: {
        premium: Number(card.premium) || 0,
        days: card.daysUntil,
        delta: card.premiumDelta ?? 0,
      },
      cells: {
        client: (
          <Link href={`/policies/${card.policyId}`} className="font-semibold text-navy hover:underline">
            {card.clientName}
          </Link>
        ),
        lob,
        carrier: card.carrierName,
        premium: formatPremiumColumn(card.premium),
        delta: card.premiumDelta == null ? "—" : formatSignedMoney(card.premiumDelta),
        days: String(card.daysUntil),
        band: RENEWAL_URGENCY_META[band].label,
        why,
        health:
          card.healthStars || card.policyHealthStars
            ? `Client ${card.healthStars.toFixed(1)} · Policy ${card.policyHealthStars.toFixed(1)}`
            : "—",
        policy: card.policyNumber,
      },
    };
  });

  return (
    <div data-ff-renewals-host-list="">
      <ColumnTable
        moduleId="renewals-host"
        searchModuleId="renewals-pipeline"
        columns={RENEWALS_HOST_LIST_COLUMNS}
        rows={rows}
        empty={<p className="text-sm text-muted-foreground">No renewals in this view.</p>}
      />
    </div>
  );
}
