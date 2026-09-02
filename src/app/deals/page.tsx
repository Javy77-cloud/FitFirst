import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PipelineBoard } from "@/components/crm/pipeline-board";
import { buttonVariants } from "@/components/ui/button";
import { StagePill } from "@/components/fit-badge";
import { SectionTabs } from "@/components/section-tabs";
import { listDeals } from "@/lib/db/queries";
import { LINE_LABELS } from "@/lib/crm/bind";
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
        Shopping lives on the deal. Quotes attach here. A policy is not created from a quote —
        only from bind. Use the pipeline to move shops; bound is reserved for bind.
      </p>
      {rows.length === 0 ? (
        <section className="ff-card px-4 py-8 text-sm text-muted-foreground">
          No shops yet. Convert a lead or{" "}
          <Link href="/deals/new" className="text-primary hover:underline">
            start a new shopping deal
          </Link>
          .
        </section>
      ) : (
        <SectionTabs
          defaultValue="pipeline"
          tabs={[
            {
              id: "pipeline",
              label: "Pipeline",
              content: <PipelineBoard deals={rows} />,
            },
            {
              id: "list",
              label: "List",
              content: (
                <section className="ff-card overflow-x-auto">
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
                            <Link
                              href={`/deals/${deal.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {deal.title}
                            </Link>
                          </td>
                          <td>
                            <StagePill stage={deal.pipelineStage} />
                          </td>
                          <td>
                            {LINE_LABELS[deal.lineOfBusiness as keyof typeof LINE_LABELS] ??
                              deal.lineOfBusiness}
                          </td>
                          <td>{deal.state}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ),
            },
          ]}
        />
      )}
    </AppShell>
  );
}
