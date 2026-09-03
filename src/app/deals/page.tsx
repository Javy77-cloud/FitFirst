import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DealListTable } from "@/components/crm/deal-list-table";
import { PipelineBoard } from "@/components/crm/pipeline-board";
import { QueryTabs, resolveQueryTab } from "@/components/crm/query-tabs";
import { buttonVariants } from "@/components/ui/button";
import { parseDealFilter } from "@/lib/crm/lists";
import { ensurePipelineStages, listDealRows } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const VIEWS = [
  { id: "list", label: "List" },
  { id: "pipeline", label: "Pipeline" },
] as const;

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; stage?: string; line?: string; state?: string }>;
}) {
  const params = await searchParams;
  const filter = parseDealFilter(params);
  const extra = {
    q: filter.q,
    stage: filter.stage,
    line: filter.line,
    state: filter.state,
  };
  const [rows, stages] = await Promise.all([listDealRows(), ensurePipelineStages()]);

  return (
    <AppShell
      title="Deals"
      actions={
        <Link href="/deals/new" className={cn(buttonVariants())}>
          Create deal
        </Link>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Phone, email, and address sit on the row — dial, mail, or copy without opening the shop.
        Call / SMS / Email / Task logs in one click. Name typed on the lead is the insured name.
        Columns stay per desk agent.
      </p>
      {rows.length === 0 ? (
        <section className="ff-card px-4 py-8 text-sm text-muted-foreground">
          No shops yet. Convert a lead or{" "}
          <Link href="/deals/new" className="text-primary hover:underline">
            create a deal
          </Link>
          .
        </section>
      ) : (
        <QueryTabs
          pathname="/deals"
          param="view"
          extra={extra}
          active={resolveQueryTab(VIEWS, params.view)}
          tabs={[
            {
              id: "list",
              label: "List",
              content: (
                <DealListTable
                  rows={rows}
                  stages={stages}
                  filter={filter}
                  filterPath="/deals"
                  filterView="list"
                />
              ),
            },
            {
              id: "pipeline",
              label: "Pipeline",
              content: <PipelineBoard rows={rows} stages={stages} filter={filter} />,
            },
          ]}
        />
      )}
    </AppShell>
  );
}
