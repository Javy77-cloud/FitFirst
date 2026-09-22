import type { ReactNode } from "react";
import { BookActivityHit } from "@/components/book-lists/book-activity-hit";
import {
  AccountStackColumnHeader,
  BookGlanceCardView,
  ContactStackColumnHeader,
} from "@/components/book-lists/glance-card";
import { PolicyStackColumnHeader } from "@/components/book-lists/policy-stack-header";
import { ActivityGlyph } from "@/components/desk/standard-activity-panel";
import { sortCommandStack } from "@/lib/book-lists/heat";
import type { BookGlanceCard } from "@/lib/book-lists/types";

export function BookPriorityStack({
  cards,
  empty,
  activity = false,
  layoutMode = "stack",
  renderExtra,
  renderLeading,
}: {
  cards: BookGlanceCard[];
  empty: string;
  activity?: boolean;
  layoutMode?: "stack" | "list";
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
  const contactStack = layoutMode === "stack" && ranked[0]?.surface === "contacts";
  const accountStack = layoutMode === "stack" && ranked[0]?.surface === "accounts";
  const policyStack = layoutMode === "stack" && ranked.some((card) => card.surface === "policies");
  const list = (
    <ol className="ff-priority-stack ff-book-stack" data-ff-priority-stack="" data-ff-book-stack="">
      {ranked.map((card) => {
        const view = (
          <BookGlanceCardView
            card={card}
            layoutMode={layoutMode}
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
  if (accountStack) {
    return (
      <div className="ff-account-priority-stack" data-ff-account-priority-stack="">
        <AccountStackColumnHeader />
        {list}
      </div>
    );
  }
  if (contactStack) {
    return (
      <div className="ff-contact-priority-stack" data-ff-contact-priority-stack="">
        <ContactStackColumnHeader />
        {list}
      </div>
    );
  }
  if (policyStack) {
    return (
      <div className="ff-policy-stack-sheet" data-ff-policy-stack-sheet="">
        <PolicyStackColumnHeader />
        {list}
      </div>
    );
  }
  return list;
}
