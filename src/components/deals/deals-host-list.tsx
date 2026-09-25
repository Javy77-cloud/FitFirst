import Link from "next/link";
import { ActivityGlyph } from "@/components/desk/standard-activity-panel";
import { ModuleListActions } from "@/components/developer-hub/module-list-actions";
import { SelectRowCheckbox } from "@/components/developer-hub/list-selection";
import { ColumnTable, type ColumnRow } from "@/components/lists/column-table";
import {
  docsGlanceLabel,
  formatPremiumColumn,
  formatSilenceCue,
  quotesGlanceLabel,
} from "@/lib/deals/card-glance";
import { dealDisplayName } from "@/components/deals/deal-host-face";
import type { RadarDealCard } from "@/lib/deals/radar-desk";
import { HEAT_LABELS, VELOCITY_PHASE_LABELS } from "@/lib/deals/velocity";
import { DEFAULT_PICK_COLUMN_WIDTH, type ListColumn } from "@/lib/list-columns";

export const DEALS_HOST_LIST_COLUMNS: ListColumn[] = [
  { id: "pick", label: "", locked: true, defaultWidth: DEFAULT_PICK_COLUMN_WIDTH },
  { id: "client", label: "Client", locked: true, liveSearch: true },
  { id: "lob", label: "LOB" },
  { id: "premium", label: "Premium" },
  { id: "heat", label: "Heat" },
  { id: "silence", label: "Silence" },
  { id: "docs", label: "Docs" },
  { id: "quotes", label: "Quotes" },
  { id: "stamps", label: "Stamps" },
  { id: "next", label: "Next" },
  { id: "owner", label: "Producer", defaultOn: false },
  { id: "phase", label: "Phase", defaultOn: false },
];

export async function DealsHostList({ cards }: { cards: RadarDealCard[] }) {
  const rows: ColumnRow[] = cards.map((card) => {
    const name = dealDisplayName(card);
    const lob = card.productLabels[0] ?? card.lineOfBusiness;
    return {
      key: card.id,
      id: card.id,
      hay: `${name} ${card.title} ${lob} ${card.lineOfBusiness} ${card.stamps.join(" ")}`,
      sort: {
        pick: "",
        premium: card.premium ?? 0,
        silence: card.silenceDays,
        heat: card.heat,
      },
      cells: {
        pick: <SelectRowCheckbox id={card.id} />,
        client: (
          <span className="inline-flex min-w-0 items-center gap-1" data-ff-list-client="">
            <Link href={card.href} className="font-semibold text-navy hover:underline">
              {name}
            </Link>
            <ActivityGlyph
              id={card.id}
              menuTestId={`deal-list-activity-${card.id}`}
              listTestId={`deal-list-activity-menu-${card.id}`}
              dealId={card.id}
              leadId={card.leadId}
              contactId={card.contactId}
              accountId={card.accountId}
            />
          </span>
        ),
        lob,
        premium: formatPremiumColumn(card.premium),
        heat: HEAT_LABELS[card.heat],
        silence: formatSilenceCue(card.silenceDays),
        docs: docsGlanceLabel(card.docsSubmitted),
        quotes: quotesGlanceLabel({
          count: card.quoteCount,
          bestPremium: card.premium,
          pending: card.pendingQuotes,
        }),
        stamps: card.stamps.length ? card.stamps.join(" · ") : "—",
        next: (
          <Link href={card.primaryAction.href} className="hover:underline">
            {card.primaryAction.label}
          </Link>
        ),
        owner: card.ownerName ?? "—",
        phase: VELOCITY_PHASE_LABELS[card.phase],
      },
    };
  });

  return (
    <div data-ff-deals-host-list="">
      <ModuleListActions
        module="deals"
        showMacrosLink={false}
        recordIds={cards.map((card) => card.id)}
        records={cards.map((card) => ({
          id: card.id,
          label: dealDisplayName(card),
          email: card.email,
          phone: card.phone,
          archivedAt: card.archivedAt,
          dealId: card.id,
          contactId: card.contactId,
          accountId: card.accountId,
          leadId: card.leadId,
        }))}
      >
        <ColumnTable
          moduleId="deals-host"
          columns={DEALS_HOST_LIST_COLUMNS}
          rows={rows}
          empty={<p className="ff-deals-empty">No shopping deals in this lens.</p>}
        />
      </ModuleListActions>
    </div>
  );
}
