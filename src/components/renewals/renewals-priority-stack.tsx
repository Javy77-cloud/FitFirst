"use client";

import Link from "next/link";
import { ActivityGlyph, useActivityPick } from "@/components/desk/standard-activity-panel";
import { RenewalCompareDrawer } from "@/components/renewals/renewal-compare-drawer";
import { RenewalHealthMeter } from "@/components/renewals/renewal-health-meter";
import { formatSilenceCue } from "@/lib/deals/card-glance";
import { stackMidLine } from "@/lib/desk/stack-mid";
import { formatMoney } from "@/lib/domain";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";
import { renewalPolicyTypeLabel } from "@/lib/renewal/policy-type";
import {
  RENEWAL_RISK_LABEL,
  RENEWAL_URGENCY_META,
  rankRenewalCards,
  renewalDaysPhrase,
  renewalRiskHover,
  renewalStackHeat,
  renewalUrgencyBand,
} from "@/lib/renewal/urgency";
import { cn } from "@/lib/utils";

export function RenewalsPriorityStack({ cards }: { cards: RenewalBoardCard[] }) {
  const activityDesk = useActivityPick();
  const ranked = rankRenewalCards(cards);

  if (ranked.length === 0) {
    return (
      <p className="ff-deals-empty" data-ff-renewals-stack-empty="">
        No renewals in this lens.
      </p>
    );
  }

  return (
    <ol className="ff-priority-stack" data-ff-renewals-priority-stack="">
      {ranked.map((card) => {
        const band = renewalUrgencyBand(card.daysUntil);
        const meta = RENEWAL_URGENCY_META[band];
        const heat = renewalStackHeat(band);
        const policyType = renewalPolicyTypeLabel(card);
        return (
          <li key={card.queueId}>
            <article
              className={cn("ff-stack-card", `ff-heat-${heat}`, `ff-urgency-tone-${meta.tone}`)}
              data-ff-renewals-stack-card={card.queueId}
              data-ff-urgency-card={band}
              data-ff-heat={heat}
              data-ff-activity-selected={activityDesk?.selectedId === card.queueId ? "true" : undefined}
              onClick={(event) => {
                if (!activityDesk) return;
                const target = event.target;
                if (!(target instanceof Element)) return;
                if (target.closest("a, button, input, select, textarea, label, form")) return;
                activityDesk.pick(card.queueId);
              }}
            >
              <span className="ff-stack-glyph" aria-hidden data-ff-stack-glyph={heat} />
              <div className="ff-stack-card-body">
                <div className="ff-stack-card-spread">
                  <Link href={`/policies/${card.policyId}`} className="ff-stack-name">
                    {card.clientName}
                  </Link>
                  <Link
                    href={`/policies/${card.policyId}/compare`}
                    className="ff-stack-mid"
                    data-ff-stack-mid=""
                    data-ff-renewal-days=""
                    data-ff-renewal-work=""
                    title="Work renewal"
                  >
                    {stackMidLine([
                      card.lastContactDays == null ? "No logged touch" : formatSilenceCue(card.lastContactDays),
                      renewalDaysPhrase(card.daysUntil),
                    ])}
                  </Link>
                  <ActivityGlyph
                    id={card.queueId}
                    menuTestId={`renewal-stack-activity-${card.queueId}`}
                    listTestId={`renewal-stack-activity-menu-${card.queueId}`}
                    policyId={card.policyId}
                          renewalDate={card.renewalDate}
                    contactId={card.contactId}
                    accountId={card.accountId}
                  />
                </div>
                <div className="ff-stack-job" data-ff-renewal-job="">
                  <ul className="ff-stack-products">
                    <li data-ff-renewal-line="">
                      <span className="ff-stack-product" data-ff-renewal-policy-type="" title={policyType}>
                        {policyType}
                      </span>
                      <span className="ff-renewal-detail-main">
                        <span data-ff-renewal-urgency="">{meta.label}</span>
                        <span
                          className={cn("ff-renewal-risk-badge", `ff-renewal-risk-${card.risk}`)}
                          data-ff-risk-badge={card.risk}
                          data-ff-risk-hover={card.risk}
                          title={renewalRiskHover(card.risk)}
                        >
                          {RENEWAL_RISK_LABEL[card.risk]}
                        </span>
                      </span>
                      <span className="ff-renewal-detail-side">
                        {card.premium ? (
                          <span className="ff-stack-value" data-ff-premium-column="">
                            {formatMoney(card.premium)}
                          </span>
                        ) : null}
                        <RenewalCompareDrawer
                          policyId={card.policyId}
                          clientName={card.clientName}
                          canCompare={card.canCompare}
                          clientHealth={card.clientHealth}
                          policyHealth={card.policyHealth}
                        />
                      </span>
                    </li>
                  </ul>
                  <RenewalHealthMeter
                    stars={card.healthStars}
                    policyStars={card.policyHealthStars}
                    flagged={card.healthFlagged}
                    source={card.healthSource}
                  />
                </div>
                {card.inboxCue ? (
                  <p className="ff-inbox-cue" data-ff-inbox-cue="">
                    {card.inboxHref ? (
                      <Link href={card.inboxHref} className="hover:underline">
                        {card.inboxCue}
                      </Link>
                    ) : (
                      card.inboxCue
                    )}
                  </p>
                ) : null}
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
