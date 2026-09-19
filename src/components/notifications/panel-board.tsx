import { NotificationUrgencyCard } from "@/components/notifications/urgency-card";
import {
  PANEL_EMPTY_BOARD,
  PANEL_URGENCY,
  PANEL_URGENCY_META,
  groupPanelByUrgency,
  type PanelCard,
} from "@/lib/notifications/panel";
import { cn } from "@/lib/utils";

export function NotificationPanelBoard({ cards }: { cards: PanelCard[] }) {
  const groups = groupPanelByUrgency(cards);

  return (
    <div className="ff-panel-board" data-ff-notification-panel-board="">
      {cards.length === 0 ? (
        <p className="ff-panel-empty-hero" data-ff-panel-empty="">
          {PANEL_EMPTY_BOARD}
        </p>
      ) : null}
      <div className="ff-renewals-urgency-board ff-panel-urgency-board">
        {PANEL_URGENCY.map((band) => {
          const column = groups[band];
          const meta = PANEL_URGENCY_META[band];
          return (
            <section
              key={band}
              className={cn("ff-renewals-urgency-col", `ff-urgency-tone-${meta.tone}`)}
              data-ff-panel-band={band}
            >
              <header className="ff-renewals-urgency-head">
                <h2>{meta.label}</h2>
                <span>{column.length}</span>
              </header>
              <div className="ff-renewals-urgency-cards">
                {column.length === 0 ? (
                  <p className="ff-renewals-urgency-empty">Clear in this band.</p>
                ) : (
                  column.map((card) => <NotificationUrgencyCard key={card.key} card={card} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
