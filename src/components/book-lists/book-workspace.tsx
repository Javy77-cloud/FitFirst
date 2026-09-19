import type { ReactNode } from "react";
import { BookBoard } from "@/components/book-lists/book-board";
import { BookLenses } from "@/components/book-lists/book-lenses";
import { BookPriorityStack } from "@/components/book-lists/book-stack";
import { DeskTruthStrip } from "@/components/desk/truth-strip";
import type {
  BookColumnMeta,
  BookGlanceCard,
  BookLayout,
  BookLensId,
  BookSurface,
} from "@/lib/book-lists/types";
import { heatShares } from "@/lib/desk/truth-strip";
import { healthPulseShares, type HealthMixLevel } from "@/lib/renewal/health";

export function BookCommandWorkspace({
  surface,
  path,
  label,
  cards,
  columns = [],
  layout,
  heat,
  lens,
  q,
  empty,
  flagged = 0,
  renderExtra,
  renderLeading,
  children,
}: {
  surface: BookSurface;
  path: string;
  label: string;
  cards: BookGlanceCard[];
  columns?: BookColumnMeta[];
  layout: BookLayout;
  heat: "hot" | "cooling" | "cold" | null;
  lens: BookLensId | null;
  q?: string | null;
  empty: string;
  flagged?: number;
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
  const health = healthPulseShares(
    cards.map((card): HealthMixLevel => {
      if (card.riskBand === "high" || card.heat === "hot") return "atrisk";
      if (card.riskBand === "medium" || card.heat === "cooling") return "watch";
      return "healthy";
    }),
  );

  return (
    <div className="ff-deals-command" data-ff-book-command={surface} data-ff-book-layout={layout}>
      <DeskTruthStrip
        surface={surface}
        label={label}
        heat={shares}
        health={surface === "carriers" ? undefined : health}
        flagged={flagged}
        clients={cards.length}
      />
      <BookLenses surface={surface} path={path} heat={heat} lens={lens} q={q} counts={counts} />
      {children}
      {layout === "bands" ? (
        <BookBoard
          cards={cards}
          columns={columns}
          empty={empty}
          renderExtra={renderExtra}
          renderLeading={renderLeading}
        />
      ) : (
        <BookPriorityStack
          cards={cards}
          empty={empty}
          renderExtra={renderExtra}
          renderLeading={renderLeading}
        />
      )}
    </div>
  );
}
