import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GapPanel } from "@/components/coverage/gap-panel";
import { BindPath } from "@/components/deal/bind-path";
import { DocumentsPanel } from "@/components/deal/documents-panel";
import { QuotingLinePicker } from "@/components/deal/quoting-line-picker";
import { MarketsPanel } from "@/components/deal/markets-panel";
import { QuoteSheetPanel } from "@/components/deal/quote-sheet-panel";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import { StagePill } from "@/components/fit-badge";
import { RecordLink } from "@/components/record-links";
import { SectionTabs } from "@/components/section-tabs";
import { LINE_LABELS } from "@/lib/crm/bind";
import { analyzeCoverageGaps } from "@/lib/coverage/gaps";
import { dealBindParty, dealGapPartyName } from "@/lib/crm/bind-path";
import { formatPersonName } from "@/lib/crm/display";
import { evaluateDealMarkets } from "@/lib/appetite/evaluate-deal";
import { getDealWorkspace, listCarriers, listEmailTemplates, listRecordAsks, sumCommissionsForPolicies } from "@/lib/db/queries";
import { listDeskUsers } from "@/lib/db/activity-queries";
import { currentDeskSession } from "@/lib/auth/session";
import { RecordAskPanel } from "@/components/record-ask";
import { RiskForm } from "@/components/deal/risk-form";
import { quotingFormById, quotingUnlockedForDeal } from "@/lib/quoting/forms";
import { dealTabShowsCommsLogs, parseAgentDealTab } from "@/lib/deals/tabs";
import { RelatedPolicies, RelatedRollups } from "@/components/related-tables";
import { toNumber } from "@/lib/commissions/math";
import { formatDay, formatMoney } from "@/lib/domain";
import { DEAL_ID } from "@/lib/fixtures/ids";
import { isUuid } from "@/lib/ids";
import { HealthStrip } from "@/components/completeness/health-strip";
import { reportFromSheet } from "@/lib/completeness/report";
import type { ShopLine } from "@/lib/domain";
import { ActivityTimeline } from "@/components/activity-timeline";
import { RecordSection } from "@/components/record-section";

export const dynamic = "force-dynamic";

export default async function DealPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; notice?: string; riskTab?: string; line?: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { tab, notice, riskTab, line: lineParam } = await searchParams;
  const activeTab = parseAgentDealTab(tab);
  const [workspace, templates, asks, users, session, carrierRows] = await Promise.all([
    getDealWorkspace(id),
    listEmailTemplates(),
    listRecordAsks("deal", id),
    listDeskUsers(),
    currentDeskSession(),
    listCarriers(),
  ]);
  if (!workspace) notFound();
  const {
    deal,
    risk,
    docs,
    fileVersions,
    fields,
    quotes,
    logs,
    lead,
    contact,
    account,
    quoteSheet,
    sheets,
    jobs,
    fillFeedback,
    boundPolicies,
    partyPolicies,
    timeline,
  } = workspace;
  const matches = session.isAdmin && risk ? await evaluateDealMarkets(risk) : [];
  const isAna = deal.id === DEAL_ID;
  const quotingLine = (deal.quotingLine as ShopLine | undefined) ?? null;
  const sheetLine = (lineParam as ShopLine | undefined)
    ?? quotingLine
    ?? (quoteSheet?.line as ShopLine | undefined)
    ?? "home";
  const activeSheet = sheets.find((sheet) => sheet.line === sheetLine) ?? quoteSheet ?? null;
  const health = activeSheet
    ? reportFromSheet(sheetLine, activeSheet.values)
    : null;
  const unlocked = quotingUnlockedForDeal(deal);
  const formLabel = quotingFormById(deal.quotingForm ?? "")?.label;
  const appetiteCarriers = Array.from(
    new Map(carrierRows.map((row) => [row.carrier.id, { id: row.carrier.id, name: row.carrier.name }])).values(),
  );
  const premium = boundPolicies.reduce((sum, policy) => sum + toNumber(policy.premium), 0);
  const commission = await sumCommissionsForPolicies(boundPolicies.map((p) => p.id));
  const commercialPath = deal.bindTarget === "account";
  const contactName = contact ? `${contact.lastName}, ${contact.firstName}` : null;
  const partyName = dealGapPartyName({
    bindTarget: deal.bindTarget,
    contactName,
    accountName: account?.name ?? null,
    fallback: lead ? formatPersonName(lead) : deal.title,
  });
  const gapPolicies = commercialPath && account
    ? partyPolicies.filter((policy) => policy.accountId === account.id)
    : contact
      ? partyPolicies.filter((policy) => policy.contactId === contact.id)
      : partyPolicies;
  const gapReport = analyzeCoverageGaps({
    policies: gapPolicies,
    partyName,
    isAna,
    quoteCount: quotes.length,
  });
  const boundParty = dealBindParty({
    bindTarget: deal.bindTarget,
    contact: contact ?? null,
    account: account ?? null,
    boundPolicies,
  });

  return (
    <AppShell title={deal.title}>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <StagePill stage={deal.pipelineStage} />
        <span>{LINE_LABELS[deal.lineOfBusiness as keyof typeof LINE_LABELS] ?? deal.lineOfBusiness}</span>
        <span className="text-muted-foreground">{deal.state}</span>
        {lead ? (
          <RecordLink href={`/leads/${lead.id}`}>
            Lead {formatPersonName(lead)}
          </RecordLink>
        ) : null}
        {contact ? (
          <RecordLink href={`/contacts/${contact.id}`}>
            Contact {contact.lastName}, {contact.firstName}
          </RecordLink>
        ) : null}
        {account ? <RecordLink href={`/accounts/${account.id}`}>Business {account.name}</RecordLink> : null}
        {boundPolicies.map((policy) => (
          <RecordLink key={policy.id} href={`/policies/${policy.id}`}>
            Policy {policy.policyNumber}
          </RecordLink>
        ))}
        {formLabel ? <span className="text-muted-foreground">Quoting {formLabel}</span> : null}
        <span className="text-muted-foreground">
          {unlocked ? "Quoting unlocked" : "Quoting locked — approve master sheet"}
        </span>
        {risk?.city ? (
          <span className="text-muted-foreground">
            {risk.city}, {risk.county} · Cov A {risk.coverageA ?? "—"}
          </span>
        ) : null}
        {deal.wonAt ? (
          <span className="text-muted-foreground">Won {formatDay(deal.wonAt)}</span>
        ) : null}
        {contact ? (
          <a href={`/contacts/${contact.id}`} className="text-primary hover:underline">
            {contact.lastName}, {contact.firstName}
          </a>
        ) : null}
      </div>

      {notice === "uploaded" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Files stored on this deal.
        </p>
      ) : null}
      {notice === "filled" ? (
        <p className="mb-3 rounded-md bg-fit-green-bg px-3 py-2 text-sm text-navy">
          Master sheet filled from source docs (blanks only). Yellow is missing. Blue is CHECK.
          Glance, then approve before quoting unlocks. Super-Copy reads this sheet — not the PDFs.
        </p>
      ) : null}

      {isAna ? (
        <div className="mb-4 rounded-md bg-fit-yellow-bg px-3 py-2 text-xs text-fit-yellow">
          Ana Dib HO3 fixture. Coverage A is $321,000 (Javy-tested). Shopping / unbound. Approve
          the master sheet to unlock Chrome Fill / copy. Do not bind this shop. Quotes are not
          coverage.
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <BindPath
          dealId={deal.id}
          defaultTarget={deal.bindTarget === "account" ? "account" : "contact"}
          lineLabel={LINE_LABELS[deal.lineOfBusiness as keyof typeof LINE_LABELS] ?? deal.lineOfBusiness}
          isAna={isAna}
          bound={deal.pipelineStage === "bound" || deal.pipelineStage === "closed_won"}
          party={boundParty}
          policies={boundPolicies.map((policy) => ({ id: policy.id, policyNumber: policy.policyNumber }))}
        />
        <GapPanel
          report={gapReport}
          href={account ? `/accounts/${account.id}` : contact ? `/contacts/${contact.id}` : undefined}
        />
      </div>

      <RecordSection id="record" title="This deal" summary="Shopping, quotes, and communications on this record">
        {health ? (
          <HealthStrip
            report={health}
            title={`Sheet health · ${health.confirmed} confirmed / ${health.missing} missing`}
            href={`/deals/${deal.id}?tab=quote-sheet`}
          />
        ) : null}

        {!deal.quotingForm ? (
          <div className="mb-4">
            <QuotingLinePicker
              dealId={deal.id}
              currentForm={deal.quotingForm}
              sourceDocCount={docs.filter((doc) => doc.slot !== "quote_pdf" && doc.slot !== "policy_file").length}
            />
          </div>
        ) : null}

        {!risk ? (
          <p className="text-sm text-muted-foreground">This deal is missing a master risk.</p>
        ) : (
          <SectionTabs
            defaultValue="documents"
            active={activeTab}
            extraQuery={sheetLine ? { line: sheetLine } : undefined}
            tabs={[
              {
                id: "documents",
                label: "Documents",
                content: (
                  <DocumentsPanel
                    dealId={deal.id}
                    riskId={risk.id}
                    contactId={contact?.id}
                    accountId={account?.id}
                    email={contact?.email ?? account?.email}
                    phone={contact?.phone ?? account?.phone}
                    docs={docs}
                    versions={fileVersions}
                    fields={fields}
                    quotingForm={deal.quotingForm}
                    sheetValues={activeSheet?.values ?? null}
                    sheetLine={sheetLine}
                    unlocked={unlocked}
                    approvedBy={deal.sheetApprovedBy}
                    jobs={jobs}
                    fillFeedback={fillFeedback}
                  />
                ),
              },
              {
                id: "quote-sheet",
                label: "Quote Sheet",
                content: (
                  <QuoteSheetPanel
                    dealId={deal.id}
                    dealTitle={deal.title}
                    values={activeSheet?.values ?? null}
                    line={sheetLine}
                    quotingForm={deal.quotingForm}
                    unlocked={unlocked}
                    approvedBy={deal.sheetApprovedBy}
                    sheetLines={sheets.map((sheet) => sheet.line)}
                    sheet={activeSheet}
                    contact={contact}
                    riskId={risk.id}
                    carriers={appetiteCarriers}
                  />
                ),
              },
              ...(session.isAdmin
                ? [
                    {
                      id: "risk",
                      label: "Master risk",
                      content: <RiskForm risk={risk} dealId={deal.id} activeTab={riskTab} />,
                    },
                    {
                      id: "markets",
                      label: "Markets",
                      content: (
                        <MarketsPanel dealId={deal.id} matches={matches} unlocked={unlocked} />
                      ),
                    },
                  ]
                : []),
              {
                id: "quotes",
                label: "Quotes",
                content: (
                  <QuotesPanel
                    dealId={deal.id}
                    quotes={quotes}
                    logs={logs}
                    quoteResultsNote={deal.quoteResultsNote}
                    quoteDocs={docs}
                    unlocked={unlocked}
                    carriers={appetiteCarriers}
                    contactId={contact?.id}
                    accountId={account?.id}
                    email={contact?.email ?? account?.email}
                    phone={contact?.phone ?? account?.phone}
                    isAna={isAna}
                  />
                ),
              },
            ]}
          />
        )}
        <RecordAskPanel
          entityType="deal"
          entityId={deal.id}
          asks={asks}
          users={users}
          dealId={deal.id}
          contactId={contact?.id}
          accountId={account?.id}
          policyId={boundPolicies[0]?.id}
          leadId={lead?.id}
          hideWhenNotAdmin
        />
        {dealTabShowsCommsLogs(activeTab) ? (
          <div className="mt-6">
            <ActivityTimeline
              items={timeline}
              dealId={deal.id}
              contactId={contact?.id}
              accountId={account?.id}
              policyId={boundPolicies[0]?.id}
              leadId={lead?.id}
              phone={contact?.phone ?? account?.phone}
              email={contact?.email ?? account?.email}
              templates={templates}
            />
          </div>
        ) : null}
      </RecordSection>

      <RecordSection
        id="related"
        title="Related"
        summary={`${boundPolicies.length} bound policies · ${formatMoney(premium)} premium · ${formatMoney(commission)} commission`}
      >
        <RelatedRollups premium={premium} commission={commission} />
        <div className="mb-3 flex flex-wrap gap-3 text-sm">
          {lead ? (
            <RecordLink href={`/leads/${lead.id}`}>
              Lead {formatPersonName(lead)}
            </RecordLink>
          ) : null}
          {contact ? (
            <RecordLink href={`/contacts/${contact.id}`}>
              Contact {contact.lastName}, {contact.firstName}
            </RecordLink>
          ) : null}
          {account ? <RecordLink href={`/accounts/${account.id}`}>Business {account.name}</RecordLink> : null}
        </div>
        <RelatedPolicies
          rows={boundPolicies.map((policy) => ({ policy, carrier: null, deal }))}
        />
        <p className="mt-4 text-xs text-muted-foreground">
          Shopping lives here.{" "}
          <Link href="/get-started" className="text-primary hover:underline">
            Run the test path
          </Link>
          .
        </p>
      </RecordSection>
    </AppShell>
  );
}
