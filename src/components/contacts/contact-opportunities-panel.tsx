import Link from "next/link";
import { RecordLink } from "@/components/record-links";
import type { DeclaredCoverageLine } from "@/lib/coverage/declared-coverage";
import {
  analyzeCoverageGaps,
  gapLineLabel,
  type CoverageLine,
  type GapPolicyInput,
} from "@/lib/coverage/gaps";
import { generateContactOpportunities } from "@/lib/coverage/opportunities";
import {
  classifyOpportunityLine,
  householdCoveredLines,
  isOpenDealStage,
  type NoticeDealInput,
} from "@/lib/coverage/notices";
import { displayStatusLabel } from "@/lib/desk/status-colors";
import { cn } from "@/lib/utils";

export type OpportunityDealRow = NoticeDealInput;

function CrossSellRow({
  title,
  detail,
  href,
  focused,
  testId,
}: {
  title: string;
  detail: string;
  href?: string;
  focused?: boolean;
  testId?: string;
}) {
  const className = cn(
    "px-3 py-2 text-sm",
    focused && "bg-amber-50 ring-1 ring-amber-300",
  );
  const inner = (
    <>
      <p className="font-medium text-navy">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
    </>
  );
  if (href) {
    return (
      <li className={className} data-ff={testId} data-ff-focus={focused ? "1" : undefined}>
        <RecordLink href={href}>{inner}</RecordLink>
      </li>
    );
  }
  return (
    <li className={className} data-ff={testId} data-ff-focus={focused ? "1" : undefined}>
      {inner}
    </li>
  );
}

export function ContactOpportunitiesPanel({
  contactId,
  partyName,
  isAna,
  policies,
  deals,
  recentLifeEvents,
  focusDealId,
  declaredCoverage,
}: {
  contactId: string;
  partyName: string;
  isAna?: boolean;
  policies: GapPolicyInput[];
  deals: OpportunityDealRow[];
  recentLifeEvents?: string | null;
  focusDealId?: string | null;
  declaredCoverage?: DeclaredCoverageLine[];
}) {
  const report = analyzeCoverageGaps({ policies, partyName, isAna, declaredCoverage });
  const inForceLines = householdCoveredLines(policies, declaredCoverage);
  const openDeals = deals.filter((deal) => isOpenDealStage(deal.pipelineStage));
  const crossSellDeals = openDeals.filter((deal) => {
    const line = classifyOpportunityLine(deal.lineOfBusiness);
    return line !== "OTHER" && !inForceLines.has(line);
  });
  const generated = generateContactOpportunities({
    policies,
    declaredCoverage,
    recentLifeEvents,
    partyName,
  });
  const uniqueMissing: CoverageLine[] = generated
    .map((row) => row.line)
    .filter((line) => !crossSellDeals.some((deal) => classifyOpportunityLine(deal.lineOfBusiness) === line));

  const empty =
    crossSellDeals.length === 0 &&
    uniqueMissing.length === 0 &&
    report.rewrites.length === 0 &&
    !isAna;

  return (
    <div className="space-y-4" data-ff-contact-opportunities="">
      <p className="text-xs text-muted-foreground">
        Open deals that fill a missing household line, plus generated opportunities from in-force
        policies, coverage with other carriers, and recent life events. Closed / bound shops stay on
        Deals. Renewals stay on the Renewals board — this is not a second queue.
      </p>
      {isAna ? (
        <p className="text-sm text-muted-foreground" data-ff-contact-opportunities-ana="">
          Ana Dib is still shopping. Quotes are not coverage and do not create cross-sell
          opportunities. Coverage A is $321,000. Do not bind Ana.
        </p>
      ) : null}
      {crossSellDeals.length > 0 ? (
        <ul
          className="divide-y divide-border rounded-md border border-border"
          data-ff-contact-opportunities-deals=""
        >
          {crossSellDeals.map((deal) => {
            const line = classifyOpportunityLine(deal.lineOfBusiness);
            return (
              <CrossSellRow
                key={deal.id}
                testId="opportunity-deal"
                focused={focusDealId === deal.id}
                href={`/deals/${deal.id}`}
                title={deal.title || "Open deal"}
                detail={`${displayStatusLabel(deal.pipelineStage)} · ${gapLineLabel(line)} — household is not covered for ${gapLineLabel(line)}.`}
              />
            );
          })}
        </ul>
      ) : null}
      {uniqueMissing.length > 0 ? (
        <ul className="space-y-2" data-ff-contact-opportunities-gaps="">
          {uniqueMissing.map((line) => {
            const generatedRow = generated.find((row) => row.line === line);
            return (
              <CrossSellRow
                key={line}
                testId="opportunity-gap"
                title={gapLineLabel(line)}
                detail={
                  generatedRow?.reason === "life_event"
                    ? generatedRow.detail
                    : `${partyName} is not covered for ${gapLineLabel(line)}. Start a shop from this contact — do not invent a deal here.`
                }
                href={`/deals/new?contactId=${contactId}`}
              />
            );
          })}
        </ul>
      ) : null}
      {report.rewrites.length > 0 ? (
        <ul className="space-y-2" data-ff-contact-opportunities-rewrites="">
          {report.rewrites.map((row) => (
            <CrossSellRow
              key={row.line}
              testId="opportunity-rewrite"
              title={`${gapLineLabel(row.line)} with another carrier`}
              detail={row.plainEnglish}
            />
          ))}
        </ul>
      ) : null}
      {empty ? (
        <p className="text-sm text-muted-foreground" data-ff-contact-opportunities-empty="">
          {report.inForceCount === 0 && report.coveredLines.length === 0
            ? `${partyName} has no in-force policy yet, so there is no household cross-sell to work.`
            : `${partyName} has no open household gaps on the lines this desk checks.`}
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
