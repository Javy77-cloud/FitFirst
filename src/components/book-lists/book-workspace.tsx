import type { ReactNode } from "react";
import { BookLiveScope } from "@/components/book-lists/book-live-scope";
import { BookBoard } from "@/components/book-lists/book-board";
import { BookKpiStrip } from "@/components/book-lists/book-kpi-strip";
import { BookLenses } from "@/components/book-lists/book-lenses";
import { BookPriorityStack } from "@/components/book-lists/book-stack";
import { StandardActivityShell } from "@/components/desk/standard-activity-panel";
import { sortCommandStack } from "@/lib/book-lists/heat";
import { partyBookKpis, policyBookKpis, type BookKpiStripModel } from "@/lib/book-lists/kpi";
import type {
  BookColumnMeta,
  BookGlanceCard,
  BookLayout,
  BookLensId,
  BookSurface,
} from "@/lib/book-lists/types";
import { heatShares } from "@/lib/desk/truth-strip";

const SEARCH_MODULE: Record<BookSurface, string> = {
  contacts: "contacts",
  accounts: "businesses",
  carriers: "carriers",
  policies: "policies",
};

function defaultBanner(
  surface: BookSurface,
  cards: BookGlanceCard[],
  lineSettings?: { writeLife: boolean; writeHealth: boolean },
): BookKpiStripModel | null {
  if (surface === "contacts") return partyBookKpis("contact", cards);
  if (surface === "accounts") return partyBookKpis("account", cards);
  if (surface === "policies") {
    return policyBookKpis(cards, lineSettings ?? { writeLife: false, writeHealth: false });
  }
  return null;
}

export function BookCommandWorkspace({
  surface,
  path,
  cards,
  columns = [],
  layout,
  heat,
  lens,
  q,
  empty,
  banner,
  lineSettings,
  preserve,
  renderExtra,
  renderLeading,
  children,
}: {
  surface: BookSurface;
  path: string;
  cards: BookGlanceCard[];
  columns?: BookColumnMeta[];
  layout: BookLayout;
  heat: "hot" | "cooling" | "cold" | null;
  lens: BookLensId | null;
  q?: string | null;
  empty: string;
  banner?: BookKpiStripModel | null;
  lineSettings?: { writeLife: boolean; writeHealth: boolean };
  preserve?: Record<string, string | undefined>;
  renderExtra?: (card: BookGlanceCard) => ReactNode;
  renderLeading?: (card: BookGlanceCard) => ReactNode;
  children?: ReactNode;
}) {
  const shares = heatShares(cards.map((card) => card.heat));
  const counts = {
    hot: shares.find((row) => row.level === "hot")?.count ?? 0,
    cooling: shares.find((row) => row.level === "cooling")?.count ?? 0,
    cold: shares.find((row) => row.level === "cold")?.count ?? 0,
  };
  const kpi = banner === undefined ? defaultBanner(surface, cards, lineSettings) : banner;
  const activity = surface === "contacts" || surface === "accounts";
  const ranked = sortCommandStack(cards);
  const activityRows = ranked.map((card) => ({
    id: card.id,
    name: card.title,
    email: card.email,
    phone: card.phone,
    contactId: surface === "contacts" ? card.id : null,
    accountId: surface === "accounts" ? card.id : null,
  }));
  const stack = (
    <BookPriorityStack
      cards={cards}
      empty={empty}
      activity={activity}
      layoutMode={layout === "list" ? "list" : "stack"}
      renderExtra={renderExtra}
      renderLeading={renderLeading}
    />
  );

  return (
    <div className="ff-deals-command" data-ff-book-command={surface} data-ff-book-layout={layout}>
      {kpi ? (
        <BookKpiStrip label={kpi.label} items={kpi.items} share={kpi.share} shareTitle={kpi.shareLabel} />
      ) : null}
      <BookLenses
        surface={surface}
        path={path}
        heat={heat}
        lens={lens}
        q={q}
        counts={counts}
        extra={preserve}
        layout={layout}
      />
      {children}
      <BookLiveScope moduleId={SEARCH_MODULE[surface]} initialQuery={q ?? ""}>
        {layout === "bands" ? (
          <BookBoard
            cards={cards}
            columns={columns}
            empty={empty}
            renderExtra={renderExtra}
            renderLeading={renderLeading}
          />
        ) : activity ? (
          <StandardActivityShell
            surface={surface === "contacts" ? "contacts-stack" : "accounts-stack"}
            rows={activityRows}
          >
            {stack}
          </StandardActivityShell>
        ) : (
          stack
        )}
      </BookLiveScope>
    </div>
  );
}
