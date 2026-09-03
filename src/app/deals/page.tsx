import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { StagePill } from "@/components/fit-badge";
import { visibleColumns } from "@/components/brand/column-layout-fields";
import { getResolvedDesk } from "@/lib/db/brand-queries";
import { listDeals } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const [rows, desk] = await Promise.all([listDeals(), getResolvedDesk()]);
  const cols = visibleColumns("deals", desk.columnLayout);
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
                {cols.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((deal) => (
                <tr key={deal.id}>
                  {cols.map((col) => (
                    <td key={col.key}>
                      {col.key === "title" ? (
                        <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline">
                          {deal.title}
                        </Link>
                      ) : col.key === "stage" ? (
                        <StagePill stage={deal.pipelineStage} />
                      ) : col.key === "line" ? (
                        deal.lineOfBusiness
                      ) : col.key === "state" ? (
                        deal.state
                      ) : deal.archivedAt ? (
                        "Archived"
                      ) : (
                        "—"
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
        </table>
      </section>
    </AppShell>
  );
}
