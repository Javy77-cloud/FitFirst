import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { StagePill } from "@/components/fit-badge";
import { listBoundPendingDeals, listDeals, type DealListFilter } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

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
    stage: first(params.stage),
    attention: first(params.attention),
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
          New shopping deal
        </Link>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">{hint}</p>
      {filter.stage || filter.attention ? (
        <p className="mb-3 text-[12px]">
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted-foreground">
                  No deals match this filter.
                </td>
              </tr>
            ) : (
              rows.map((deal) => (
                <tr key={deal.id}>
                  <td>
                    <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline">
                      {deal.title}
                    </Link>
                  </td>
                  <td>
                    <StagePill stage={deal.pipelineStage} />
                  </td>
                  <td>{deal.lineOfBusiness}</td>
                  <td>{deal.state}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
