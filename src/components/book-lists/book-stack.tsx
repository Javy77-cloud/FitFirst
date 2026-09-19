import type { ReactNode } from "react";
import { BookGlanceCardView } from "@/components/book-lists/glance-card";
import { sortCommandStack } from "@/lib/book-lists/heat";
import type { BookGlanceCard } from "@/lib/book-lists/types";

export function BookPriorityStack({
  cards,
  empty,
  renderExtra,
  renderLeading,
}: {
  cards: BookGlanceCard[];
  empty: string;
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
      {ranked.map((card) => (
        <li key={card.id}>
          <BookGlanceCardView
            card={card}
            leading={renderLeading?.(card)}
            extra={renderExtra?.(card)}
          />
        </li>
      ))}
    </ol>
  );
}
