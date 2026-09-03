import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BindForm } from "@/components/crm/bind-form";
import { CompleteTaskForm } from "@/components/crm/complete-task-form";
import { LifeHealthPanel } from "@/components/crm/life-health-panel";
import { DocumentsPanel } from "@/components/deal/documents-panel";
import { MarketsPanel } from "@/components/deal/markets-panel";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import { RiskForm } from "@/components/deal/risk-form";
import { StagePill } from "@/components/fit-badge";
import { QueryTabs, resolveQueryTab } from "@/components/crm/query-tabs";
import { evaluateDealMarkets } from "@/lib/appetite/evaluate-deal";
import { formatTenure, formatIsoDate, taskKindLabel } from "@/lib/crm/display";
import { accountDisplayName, defaultAccountKind, isCrmOnlyLine, LINE_LABELS } from "@/lib/crm/bind";
import { QUOTE_PDF_DOC_TYPE } from "@/lib/crm/quote-pdf";
import { getDealWorkspace } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const DEAL_TABS = [
  { id: "documents", label: "Documents" },
  { id: "risk", label: "Master risk" },
  { id: "markets", label: "Markets" },
  { id: "quotes", label: "Quotes" },
] as const;

export default async function DealPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const workspace = await getDealWorkspace(id);
  if (!workspace) notFound();
  const { deal, risk, docs, fields, quotes, logs, lead, contact, boundPolicy, dealTasks } =
    workspace;
  const crmOnly = isCrmOnlyLine(deal.lineOfBusiness);
  const matches = !crmOnly && risk ? await evaluateDealMarkets(risk) : [];
  const bound = deal.pipelineStage === "bound";
  const quoteDocs = docs.filter((doc) => doc.docType === QUOTE_PDF_DOC_TYPE);
  const accountKind = defaultAccountKind(deal.lineOfBusiness);

  return (
    <AppShell title={deal.title}>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <StagePill stage={deal.pipelineStage} />
        <span>{LINE_LABELS[deal.lineOfBusiness as keyof typeof LINE_LABELS] ?? deal.lineOfBusiness}</span>
        <span className="text-muted-foreground">{deal.state}</span>
        {deal.primaryNamedInsured ? (
          <span className="text-muted-foreground">
            {deal.primaryNamedInsured}
            {deal.secondaryNamedInsured ? ` · ${deal.secondaryNamedInsured}` : ""}
          </span>
        ) : lead ? (
          <Link href={`/leads/${lead.id}`} className="text-muted-foreground hover:text-primary">
            Lead {lead.lastName}, {lead.firstName}
          </Link>
        ) : null}
        {contact ? (
          <Link href={`/contacts/${contact.id}`} className="text-muted-foreground hover:text-primary">
            {contact.accountKind === "commercial" ? "Business" : "Contact"}{" "}
            {accountDisplayName(contact)}
          </Link>
        ) : null}
        {boundPolicy ? (
          <Link href={`/policies/${boundPolicy.id}`} className="text-muted-foreground hover:text-primary">
            Policy {boundPolicy.policyNumber}
          </Link>
        ) : null}
        {risk?.city ? (
          <span className="text-muted-foreground">
            {risk.city}, {risk.county} · Cov A {risk.coverageA ?? "—"}
          </span>
        ) : null}
      </div>

      {bound ? (
        <section className="mb-4 ff-card p-4">
          <h2 className="text-sm font-semibold text-navy">Bound</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Contact and policy exist because this deal was bound
            {deal.boundAt ? ` on ${formatIsoDate(deal.boundAt)}` : ""}. Quotes on the shop did
            not create the policy.
          </p>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-[11px] uppercase text-muted-foreground">
                {contact?.accountKind === "commercial" ? "Business" : "Contact"}
              </dt>
              <dd>
                {contact ? (
                  <Link href={`/contacts/${contact.id}`} className="font-medium text-primary hover:underline">
                    {accountDisplayName(contact)}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase text-muted-foreground">Policy</dt>
              <dd>
                {boundPolicy ? (
                  <Link
                    href={`/policies/${boundPolicy.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {boundPolicy.policyNumber}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase text-muted-foreground">Tenure</dt>
              <dd>{contact ? formatTenure(contact.tenureStart) : "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase text-muted-foreground">Lifetime / active</dt>
              <dd>
                {contact ? `${contact.policyCount} / ${contact.activePolicyCount}` : "—"}
              </dd>
            </div>
          </dl>
          {dealTasks.length > 0 ? (
            <ul className="mt-3 divide-y divide-border rounded-md border border-border">
              {dealTasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div>
                    <div>{task.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {taskKindLabel(task.kind)} · {formatIsoDate(task.dueDate)} · {task.status}
                    </div>
                  </div>
                  {task.status === "open" ? <CompleteTaskForm taskId={task.id} /> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : (
        <div className="mb-4">
          <BindForm
            dealId={deal.id}
            defaultAccountKind={accountKind}
            line={deal.lineOfBusiness}
          />
        </div>
      )}

      {crmOnly ? (
        <LifeHealthPanel deal={deal} />
      ) : !risk ? (
        <p className="text-sm text-muted-foreground">This deal is missing a master risk.</p>
      ) : (
        <QueryTabs
          pathname={`/deals/${deal.id}`}
          param="tab"
          active={resolveQueryTab(DEAL_TABS, tab)}
          tabs={[
            {
              id: "documents",
              label: "Documents",
              content: (
                <DocumentsPanel dealId={deal.id} riskId={risk.id} docs={docs} fields={fields} />
              ),
            },
            {
              id: "risk",
              label: "Master risk",
              content: <RiskForm risk={risk} dealId={deal.id} />,
            },
            {
              id: "markets",
              label: "Markets",
              content: <MarketsPanel dealId={deal.id} matches={matches} />,
            },
            {
              id: "quotes",
              label: "Quotes",
              content: <QuotesPanel quotes={quotes} logs={logs} quoteDocs={quoteDocs} />,
            },
          ]}
        />
      )}
    </AppShell>
  );
}
