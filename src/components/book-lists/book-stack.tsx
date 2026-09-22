import type { ReactNode } from "react";
import { BookActivityHit } from "@/components/book-lists/book-activity-hit";
import { BookGlanceCardView } from "@/components/book-lists/glance-card";
import { ActivityGlyph } from "@/components/desk/standard-activity-panel";
import { sortCommandStack } from "@/lib/book-lists/heat";
import type { BookGlanceCard } from "@/lib/book-lists/types";

export function BookPriorityStack({
  cards,
  empty,
  activity = false,
  renderExtra,
  renderLeading,
}: {
  cards: BookGlanceCard[];
  empty: string;
  activity?: boolean;
  renderExtra?: (card: BookGlanceCard) => ReactNode;
  renderLeading?: (card: BookGlanceCard) => ReactNode;
}) {
  const ranked = sortCommandStack(cards);
  if (ranked.length === 0) {
    return (
      <p className="ff-deals-empty" data-ff-book-stack-empty="">
        {empty}
      </p>
    );
  }
  return (
    <ol className="ff-priority-stack ff-book-stack" data-ff-priority-stack="" data-ff-book-stack="">
      {ranked.map((card) => {
        const view = (
          <BookGlanceCardView
            card={card}
            layoutMode="stack"
            leading={renderLeading?.(card)}
            extra={renderExtra?.(card)}
            activity={
              activity ? (
                <ActivityGlyph
                  id={card.id}
                  menuTestId={`book-activity-${card.id}`}
                  listTestId={`book-activity-menu-${card.id}`}
                  contactId={card.surface === "contacts" ? card.id : undefined}
                  accountId={card.surface === "accounts" ? card.id : undefined}
                />
              ) : null
            }
          />
        );
        return (
          <li key={card.id}>
            {activity ? <BookActivityHit id={card.id}>{view}</BookActivityHit> : view}
          </li>
        );
      })}
    </ol>
  );
}
