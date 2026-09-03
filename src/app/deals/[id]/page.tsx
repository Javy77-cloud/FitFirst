import Link from "next/link";
import { notFound } from "next/navigation";
import { bindDeal } from "@/app/actions/crm";
import { addShopLine, fillQuoteSheet } from "@/app/actions/quote-sheet";
import { AppShell } from "@/components/app-shell";
import { PropertyAddressLinks } from "@/components/address-links";
import { DealFiles } from "@/components/deal/deal-files";
import { MarketsPanel } from "@/components/deal/markets-panel";
import { QuotesPanel } from "@/components/deal/quotes-panel";
import { QuoteSheetForm } from "@/components/deal/quote-sheet-form";
import { StagePill } from "@/components/fit-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionTabs } from "@/components/section-tabs";
import { evaluateDealMarkets } from "@/lib/appetite/evaluate-deal";
import { getDealWorkspace } from "@/lib/db/queries";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import {
  FIRST_CLASS_LINES,
  SHOP_LINE_LABELS,
  SHOP_LINES,
  formatMoney,
  type ShopLine,
} from "@/lib/domain";
import { CopySheetButton } from "@/components/deal/copy-sheet-button";
import { SUPER_COPY_LABEL, buildCopySheetText } from "@/lib/quote-sheet/super-copy";

export const dynamic = "force-dynamic";

function asShopLine(value: string): ShopLine | null {
  return (SHOP_LINES as readonly string[]).includes(value) ? (value as ShopLine) : null;
}

function visibleLines(shopLines: string[]): ShopLine[] {
  const apply = new Set(shopLines.filter((l): l is ShopLine => Boolean(asShopLine(l))));
  if (apply.size === 0) apply.add("home");
  const out: ShopLine[] = [];
  for (const line of SHOP_LINES) {
    if (apply.has(line)) out.push(line);
    else if (FIRST_CLASS_LINES.includes(line) && (apply.has("home") || apply.has("auto"))) {
      out.push(line);
    }
  }
  return out;
}

export default async function DealPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ line?: string; tab?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const workspace = await getDealWorkspace(id);
  if (!workspace) notFound();
  const { deal, risk, docs, fields, quotes, logs, lead, contact, sheets, jobs } = workspace;
  const matches = risk ? await evaluateDealMarkets(risk) : [];

  const lines = visibleLines(deal.shopLines ?? ["home"]);
  const requested = query.line ? asShopLine(query.line) : null;
  const activeLine = requested && lines.includes(requested) ? requested : lines[0];
  const sheet =
    sheets.find((s) => s.line === activeLine) ?? {
      id: "pending",
      tenantId: deal.tenantId,
      dealId: deal.id,
      line: activeLine,
      values: emptySheetValues(activeLine),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

  const unusedLines = SHOP_LINES.filter((line) => !lines.includes(line));
  const address = {
    address1: sheet.values.address1?.value || risk?.address1,
    city: sheet.values.city?.value || risk?.city,
    state: sheet.values.state?.value || risk?.state,
    zip: sheet.values.zip?.value || risk?.zip,
  };

  return (
    <AppShell
      title={deal.title}
      actions={
        deal.pipelineStage !== "bound" ? (
          <form action={bindDeal} className="flex items-center gap-2">
            <input type="hidden" name="dealId" value={deal.id} />
            <Input
              name="policyNumber"
              placeholder="Policy # at bind"
              className="h-8 w-36"
            />
            <Button type="submit" size="sm" variant="secondary">
              Bind (creates contact + policy)
            </Button>
          </form>
        ) : null
      }
    >
      <div className="mb-4 ff-card p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <StagePill stage={deal.pipelineStage} />
          <span>{deal.lineOfBusiness}</span>
          <span className="text-muted-foreground">{deal.state}</span>
          {deal.primaryNamedInsured ? (
            <span className="text-muted-foreground">
              {deal.primaryNamedInsured}
              {deal.secondaryNamedInsured ? ` · ${deal.secondaryNamedInsured}` : ""}
            </span>
          ) : lead ? (
            <span className="text-muted-foreground">
              Lead {lead.lastName}, {lead.firstName}
            </span>
          ) : null}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Glance
            label="Coverage amount"
            value={deal.coverageAmount != null ? formatMoney(deal.coverageAmount) : "—"}
            hint="From Cov A on the Quote Sheet"
          />
          <Glance
            label="Property"
            value={deal.propertyOneliner || "—"}
            hint="Glance only — edit the sheet"
            extra={<PropertyAddressLinks address={address} />}
          />
          <Glance
            label="Current carrier"
            value={deal.currentCarrier || "—"}
            hint="Copied onto header blanks after fill"
          />
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Header is a glance. The Quote Sheet is the edit form. Zillow / FEMA are address links
          only — never a Zestimate as Cov A. Copy sheet is the in-desk packet ({SUPER_COPY_LABEL}).
          Fill is in the product. Portal paste is a human or a bot — no TypTap login here.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1 rounded-md bg-muted p-1">
        {lines.map((line) => {
          const selected = line === activeLine;
          return (
            <Link
              key={line}
              href={`/deals/${deal.id}?line=${line}`}
              className={
                selected
                  ? "rounded-sm bg-card px-2.5 py-1 text-sm font-medium text-navy shadow-sm"
                  : "rounded-sm px-2.5 py-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              }
            >
              {SHOP_LINE_LABELS[line]}
            </Link>
          );
        })}
        {unusedLines.length > 0 ? (
          <form action={addShopLine} className="ml-2 flex items-center gap-1">
            <input type="hidden" name="dealId" value={deal.id} />
            <select
              name="line"
              className="h-7 rounded-md border border-input bg-card px-2 text-xs"
              defaultValue={unusedLines[0]}
            >
              {unusedLines.map((line) => (
                <option key={line} value={line}>
                  {SHOP_LINE_LABELS[line]}
                </option>
              ))}
            </select>
            <Button type="submit" variant="ghost" size="xs">
              Add line
            </Button>
          </form>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <form action={fillQuoteSheet}>
          <input type="hidden" name="dealId" value={deal.id} />
          <input type="hidden" name="line" value={activeLine} />
          <Button type="submit" size="sm">
            Fill Quote Sheet
          </Button>
        </form>
        <CopySheetButton
          text={buildCopySheetText({
            line: activeLine,
            dealId: deal.id,
            dealTitle: deal.title,
            values: sheet.values,
            contactName: contact ? `${contact.firstName} ${contact.lastName}` : null,
            contactDob: contact?.dateOfBirth ?? null,
          })}
        />
        <Link
          href={`/api/deals/${deal.id}/quote-sheets/${activeLine}/super-copy`}
          className="inline-flex h-7 items-center rounded-md border border-border px-2.5 text-[0.8rem] font-medium"
        >
          Super-Copy JSON
        </Link>
        <Link
          href={`/deals/${deal.id}/quote-sheet/${activeLine}/print`}
          className="inline-flex h-7 items-center rounded-md border border-border px-2.5 text-[0.8rem] font-medium"
        >
          Print Quote Sheet
        </Link>
      </div>

      {!risk ? (
        <p className="text-sm text-muted-foreground">This deal is missing a master risk.</p>
      ) : (
        <SectionTabs
          defaultValue="sheet"
          tabs={[
            {
              id: "sheet",
              label: "Quote Sheet",
              content: (
                <QuoteSheetForm
                  dealId={deal.id}
                  dealTitle={deal.title}
                  line={activeLine}
                  sheet={sheet}
                  contact={contact}
                />
              ),
            },
            {
              id: "files",
              label: "Files",
              content: (
                <DealFiles
                  dealId={deal.id}
                  riskId={risk.id}
                  line={activeLine}
                  docs={docs}
                  jobs={jobs}
                  fields={fields}
                />
              ),
            },
            {
              id: "markets",
              label: "Markets",
              content: <MarketsPanel dealId={deal.id} matches={matches} />,
            },
            {
              id: "quotes",
              label: "Quotes",
              content: <QuotesPanel quotes={quotes} logs={logs} />,
            },
          ]}
        />
      )}
    </AppShell>
  );
}

function Glance({
  label,
  value,
  hint,
  extra,
}: {
  label: string;
  value: string;
  hint: string;
  extra?: import("react").ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-navy">{value}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
      {extra}
    </div>
  );
}
