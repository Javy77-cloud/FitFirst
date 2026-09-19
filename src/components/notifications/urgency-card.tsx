"use client";

import Link from "next/link";
import { sendRenewalChase } from "@/app/actions/renewals-wedge";
import { dismissPanelCard, sendRenewalSilenceReminder, snoozePanelCard } from "@/app/actions/notification-panel";
import type { PanelCard } from "@/lib/notifications/panel";
import { PANEL_KIND_LABEL, PANEL_URGENCY_META } from "@/lib/notifications/panel";
import { cn } from "@/lib/utils";

export function NotificationUrgencyCard({ card }: { card: PanelCard }) {
  const meta = PANEL_URGENCY_META[card.urgency];
  const primaryHref = card.primary.href || card.href;

  return (
    <article
      className={cn("ff-panel-card", `ff-urgency-tone-${meta.tone}`)}
      data-ff-panel-card={card.key}
      data-ff-panel-kind={card.kind}
      data-ff-panel-urgency={card.urgency}
      data-ff-panel-source={card.source}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="ff-panel-kind">
          {PANEL_KIND_LABEL[card.kind]}
          {card.escalated ? <span className="ff-autopilot-escalated">Escalated once</span> : null}
        </p>
        <span className={cn("ff-renewal-risk-badge", `ff-renewal-risk-${card.urgency}`)}>{meta.label}</span>
      </div>
      <p className="ff-panel-entity">
        <Link href={card.href} className="hover:underline">
          {card.entityLine}
        </Link>
      </p>
      <p className="ff-renewal-why" title={card.why}>
        {card.why}
      </p>
      <div className="ff-panel-actions">
        {card.kind === "renewal_autopilot" && card.policyId ? (
          <form action={sendRenewalChase}>
            <input type="hidden" name="policyId" value={card.policyId} />
            {card.contactId ? <input type="hidden" name="contactId" value={card.contactId} /> : null}
            {card.alertId ? <input type="hidden" name="alertId" value={card.alertId} /> : null}
            <input type="hidden" name="clientName" value={card.clientName || card.entityLine} />
            <input type="hidden" name="daysUntil" value={String(card.daysUntil ?? 45)} />
            <input type="hidden" name="returnTo" value="/notifications?notice=autopilot_sent" />
            <button type="submit" className="ff-panel-primary" data-ff-autopilot-confirm="">
              {card.primary.label}
            </button>
          </form>
        ) : card.kind === "renewal_silence" && card.policyId ? (
          <form action={sendRenewalSilenceReminder}>
            <input type="hidden" name="policyId" value={card.policyId} />
            {card.contactId ? <input type="hidden" name="contactId" value={card.contactId} /> : null}
            {card.alertId ? <input type="hidden" name="alertId" value={card.alertId} /> : null}
            <input type="hidden" name="entityLine" value={card.entityLine} />
            <button type="submit" className="ff-panel-primary">
              {card.primary.label}
            </button>
          </form>
        ) : (
          <Link href={primaryHref} className="ff-panel-primary">
            {card.primary.label}
          </Link>
        )}
        <div className="ff-panel-secondary">
          {card.alertId ? (
            <>
              <form action={snoozePanelCard}>
                <input type="hidden" name="alertId" value={card.alertId} />
                <input type="hidden" name="amount" value="1" />
                <input type="hidden" name="unit" value="days" />
                <button type="submit" className="ff-panel-ghost">
                  Snooze 1d
                </button>
              </form>
              <form action={dismissPanelCard}>
                <input type="hidden" name="alertId" value={card.alertId} />
                <button type="submit" className="ff-panel-ghost">
                  Dismiss
                </button>
              </form>
            </>
          ) : (
            <Link href={card.href} className="ff-panel-ghost">
              Open
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
