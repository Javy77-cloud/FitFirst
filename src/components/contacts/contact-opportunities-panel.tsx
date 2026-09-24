import Link from "next/link";
import { RecordLink } from "@/components/record-links";
import type { DeclaredCoverageLine } from "@/lib/coverage/declared-coverage";
import { classifyCoverageLine, type GapPolicyInput } from "@/lib/coverage/gaps";
import {
  generateContactOpportunities,
  type GeneratedOpportunity,
} from "@/lib/coverage/opportunities";
import {
  classifyOpportunityLine,
  isOpenDealStage,
  type NoticeDealInput,
} from "@/lib/coverage/notices";
import { displayStatusLabel } from "@/lib/desk/status-colors";
import type { ContactDependent, ElsewhereCoverageRow } from "@/lib/db/schema";
import { isInForcePolicyStatus } from "@/lib/lifecycle/client-status";
import { cn } from "@/lib/utils";

export type OpportunityDealRow = NoticeDealInput;

function OpportunityCard({
  title,
  detail,
  href,
  ctaLabel,
  focused,
  testId,
  reason,
}: {
  title: string;
  detail: string;
  href?: string;
  ctaLabel?: string;
  focused?: boolean;
  testId?: string;
  reason?: string;
}) {
  const className = cn(
    "px-3 py-2 text-sm",
    focused && "bg-amber-50 ring-1 ring-amber-300",
  );
  const body = (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium text-navy">{title}</p>
        {reason ? (
          <span className="text-[10px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
            {reason.replace("_", " ")}
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
      {ctaLabel ? (
        <p className="mt-1 text-[11px] font-semibold text-primary">{ctaLabel}</p>
      ) : null}
    </>
  );
  if (href) {
    return (
      <li
        className={className}
        data-ff={testId}
        data-ff-opportunity-reason={reason}
        data-ff-focus={focused ? "1" : undefined}
      >
        <RecordLink href={href}>{body}</RecordLink>
      </li>
    );
  }
  return (
    <li
      className={className}
      data-ff={testId}
      data-ff-opportunity-reason={reason}
      data-ff-focus={focused ? "1" : undefined}
    >
      {body}
    </li>
  );
}

function ctaHref(row: GeneratedOpportunity, contactId: string): string | undefined {
  if (!row.cta) return undefined;
  if (row.cta.kind === "start_deal") {
    return `/deals/new?contactId=${contactId}&line=${encodeURIComponent(row.suggestedLine)}`;
  }
  return `/contacts/${contactId}?tab=coverage`;
}

/**
 * Opportunities tab — actionable gaps from coverage, household facts, and renewal signals.
 */
export function ContactOpportunitiesPanel({
  contactId,
  partyName,
  isAna,
  policies,
  deals,
  recentLifeEvents,
  focusDealId,
  declaredCoverage,
  elsewhereCoverage = [],
  dependents = [],
  spouseName,
  occupation,
}: {
  contactId: string;
  partyName: string;
  isAna?: boolean;
  policies: GapPolicyInput[];
  deals: OpportunityDealRow[];
  recentLifeEvents?: string | null;
  focusDealId?: string | null;
  declaredCoverage?: DeclaredCoverageLine[];
  elsewhereCoverage?: ElsewhereCoverageRow[];
  dependents?: ContactDependent[];
  spouseName?: string | null;
  occupation?: string | null;
}) {
  const openDeals = deals.filter((deal) => isOpenDealStage(deal.pipelineStage));
  const openDealLines = openDeals
    .map((deal) => classifyOpportunityLine(deal.lineOfBusiness))
    .filter((line) => line !== "OTHER");

  const generated = generateContactOpportunities({
    policies,
    declaredCoverage,
    elsewhereCoverage,
    recentLifeEvents,
    partyName,
    dependents,
    spouseName,
    occupation,
    openDealLines,
    contactId,
  });

  const dealRows = openDeals.filter((deal) => {
    const line = classifyOpportunityLine(deal.lineOfBusiness);
    if (line === "OTHER") return false;
    return !policies.some(
      (p) =>
        classifyCoverageLine(p.lineOfBusiness) === line && isInForcePolicyStatus(p.status),
    );
  });

  const empty = dealRows.length === 0 && generated.length === 0 && !isAna;

  return (
    <div className="space-y-4" data-ff-contact-opportunities="">
      <p className="text-xs text-muted-foreground">
        Actionable gaps from coverage (with us vs elsewhere), household facts on Contact Details, and
        life-event / renewal signals. Each row has a short title, why it matters, and an optional CTA.
      </p>
      {isAna ? (
        <p className="text-sm text-muted-foreground" data-ff-contact-opportunities-ana="">
          Ana Dib is still shopping. Quotes are not coverage and do not create cross-sell
          opportunities. Coverage A is $321,000. Do not bind Ana.
        </p>
      ) : null}

      {dealRows.length > 0 ? (
        <ul
          className="divide-y divide-border rounded-md border border-border"
          data-ff-contact-opportunities-deals=""
        >
          {dealRows.map((deal) => (
            <OpportunityCard
              key={deal.id}
              testId="opportunity-deal"
              focused={focusDealId === deal.id}
              href={`/deals/${deal.id}`}
              title={deal.title || "Open deal"}
              detail={`${displayStatusLabel(deal.pipelineStage)} · open shop for a household gap.`}
              ctaLabel="Open deal"
              reason="deal"
            />
          ))}
        </ul>
      ) : null}

      {generated.length > 0 ? (
        <ul
          className="divide-y divide-border rounded-md border border-border"
          data-ff-contact-opportunities-generated=""
        >
          {generated.map((row) => (
            <OpportunityCard
              key={row.id}
              testId="opportunity-gap"
              href={ctaHref(row, contactId)}
              title={row.title}
              detail={row.detail}
              ctaLabel={row.cta?.label}
              reason={row.reason}
            />
          ))}
        </ul>
      ) : null}

      {empty ? (
        <p className="text-sm text-muted-foreground" data-ff-contact-opportunities-empty="">
          {partyName} has no open household gaps on the lines this desk checks.
        </p>
      ) : null}

      <p className="text-[11px] text-muted-foreground">
        Every deal, including won and lost, is under{" "}
        <Link href="#deals" className="text-primary hover:underline">
          Deals
        </Link>
        . Opportunity pings land on the existing notification bell and board.
      </p>
    </div>
  );
}
