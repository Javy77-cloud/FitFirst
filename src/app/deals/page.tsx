import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { StagePill } from "@/components/fit-badge";
import { listBoundPendingDeals, listDeals, type DealListFilter } from "@/lib/db/queries";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { DEAL_STAGES, LINES } from "@/lib/domain";
import { firstParam } from "@/lib/saved-filters";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STAGE_HINT: Record<string, string> = {
  open: "Open quotes — shopping, quoting, comparing. Ana's HO3 lives here.",
  quote_sent: "Quote sent. Still not coverage.",
  won: "Closed won / bound this book. Issue may still be outstanding.",
};

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter: DealListFilter = {
    stage: firstParam(params.stage),
    attention: firstParam(params.attention),
    line: firstParam(params.line),
    state: firstParam(params.state),
  };
  const rows =
    filter.attention === "bound_pending" ? await listBoundPendingDeals() : await listDeals(filter);
  const hint =
    filter.attention === "bound_pending"
      ? "Bound, waiting on the carrier to issue. No in-force policy on the file."
      : filter.stage
        ? (STAGE_HINT[filter.stage] ?? `Stage · ${filter.stage}`)
        : "Shopping lives on the deal. Quotes attach here. A policy is not created from a quote.";

  return (
    <AppShell
      title="Deals"
      actions={
        <Link href="/deals/new" className={cn(buttonVariants())}>
          Create deal
        </Link>
      }
    >
      <p className="mb-3 text-base text-muted-foreground">{hint}</p>
      <SavedFiltersBar
        moduleId="deals"
        fields={[
          {
            key: "stage",
            label: "Stage",
            options: [
              { value: "open", label: "open" },
              { value: "quote_sent", label: "quote sent" },
              { value: "won", label: "closed won" },
              ...DEAL_STAGES.map((value) => ({ value, label: value.replaceAll("_", " ") })),
            ],
          },
          {
            key: "line",
            label: "Line",
            options: LINES.map((value) => ({ value, label: value })),
          },
          {
            key: "state",
            label: "State",
            options: [{ value: "FL", label: "FL" }],
          },
          {
            key: "attention",
            label: "Attention",
            options: [{ value: "bound_pending", label: "bound pending" }],
          },
        ]}
      />
      {filter.stage || filter.attention ? (
        <p className="mb-3 text-sm">
          <Link href="/deals" className="text-primary hover:underline">
            Clear filter
          </Link>
          {" · "}
          <Link href="/" className="text-primary hover:underline">
            Back to home
          </Link>
        </p>
      ) : null}
      <section className="ff-card overflow-hidden">
        <table className="ff-table">
          <thead>
            <tr>
              <th>Deal</th>
              <th>Stage</th>
              <th>Line</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((deal) => (
              <tr key={deal.id}>
                <td>
                  <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline">
                    {deal.title}
                  </Link>
                  {deal.contactId ? (
                    <div className="text-[11px]">
                      <Link href={`/contacts/${deal.contactId}`} className="text-primary">
                        Contact
                      </Link>
                    </div>
                  ) : deal.leadId ? (
                    <div className="text-[11px]">
                      <Link href={`/leads/${deal.leadId}`} className="text-primary">
                        Lead
                      </Link>
                    </div>
                  ) : null}
                </td>
                <td>
                  <StagePill stage={deal.pipelineStage} />
                </td>
                <td>{deal.lineOfBusiness}</td>
                <td>{deal.state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
