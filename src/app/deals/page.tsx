import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { StagePill } from "@/components/fit-badge";
import { listDeals } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const rows = await listDeals();
  return (
    <AppShell
      title="Deals"
      actions={
        <Link href="/deals/new" className={cn(buttonVariants())}>
          New shopping deal
        </Link>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Shopping lives on the deal. Quotes attach here. A policy is not created from a quote.
      </p>
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
