import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DealListTable } from "@/components/crm/deal-list-table";
import { PipelineBoard } from "@/components/crm/pipeline-board";
import { QueryTabs, resolveQueryTab } from "@/components/crm/query-tabs";
import { buttonVariants } from "@/components/ui/button";
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
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
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
        Open the column picker to show phone, email, Cov A, city, and more. Log a call, SMS, email,
        or task from the row — the deal stays closed. Nothing is sent outside the desk.
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
          active={resolveQueryTab(VIEWS, view)}
          tabs={[
            {
              id: "list",
              label: "List",
              content: <DealListTable rows={rows} stages={stages} />,
            },
            {
              id: "pipeline",
              label: "Pipeline",
              content: <PipelineBoard deals={rows.map((row) => row.deal)} stages={stages} />,
            },
          ]}
        />
      )}
    </AppShell>
  );
}
