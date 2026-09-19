import type { ReactNode } from "react";
import { BookGlanceCardView } from "@/components/book-lists/glance-card";
import type { BookColumnMeta, BookGlanceCard } from "@/lib/book-lists/types";
import { cn } from "@/lib/utils";

function groupByColumn(
  cards: BookGlanceCard[],
  columns: BookColumnMeta[],
): Record<string, BookGlanceCard[]> {
  const groups = Object.fromEntries(columns.map((column) => [column.id, [] as BookGlanceCard[]]));
  for (const card of cards) {
    (groups[card.column] ?? groups[columns[0]!.id])!.push(card);
  }
  return groups;
}

export function BookBoard({
  cards,
  columns,
  empty,
  renderExtra,
  renderLeading,
}: {
  cards: BookGlanceCard[];
  columns: BookColumnMeta[];
  empty: string;
  renderExtra?: (card: BookGlanceCard) => ReactNode;
  renderLeading?: (card: BookGlanceCard) => ReactNode;
}) {
  if (cards.length === 0) {
    return (
      <p className="ff-deals-empty" data-ff-book-board-empty="">
        {empty}
      </p>
    );
  }
  const groups = groupByColumn(cards, columns);
  return (
    <div className="ff-book-board" data-ff-book-board="">
      {columns.map((column) => {
        const rows = groups[column.id] ?? [];
        return (
          <section
            key={column.id}
            className={cn("ff-renewals-urgency-col", `ff-urgency-tone-${column.tone}`)}
            data-ff-book-column={column.id}
          >
            <header className="ff-renewals-urgency-head">
              <h2>{column.label}</h2>
              <span>{rows.length}</span>
            </header>
            <div className="ff-renewals-urgency-cards">
              {rows.length === 0 ? (
                <p className="ff-renewals-urgency-empty">Nothing in this band.</p>
              ) : (
                rows.map((card) => (
                  <BookGlanceCardView
                    key={card.id}
                    card={card}
                    leading={renderLeading?.(card)}
                    extra={renderExtra?.(card)}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
