import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DealListTable } from "@/components/crm/deal-list-table";
import { PipelineBoard } from "@/components/crm/pipeline-board";
import { QueryTabs, resolveQueryTab } from "@/components/crm/query-tabs";
import { StageEditor } from "@/components/crm/stage-editor";
import { buttonVariants } from "@/components/ui/button";
import { ensurePipelineStages, listDealRows } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const VIEWS = [
  { id: "columns", label: "Columns" },
  { id: "list", label: "List" },
] as const;

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const [rows, stages] = await Promise.all([listDealRows(), ensurePipelineStages()]);
  const deals = rows.map((row) => row.deal);

  return (
    <AppShell
      title="Pipeline"
      actions={
        <Link href="/deals/new" className={cn(buttonVariants())}>
          Create deal
        </Link>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Kanban columns and the list are the same shops. Create a deal without leaving this page.
        Bound stays locked so a quote cannot mint a policy.
      </p>
      <QueryTabs
        pathname="/pipeline"
        param="view"
        active={resolveQueryTab(VIEWS, view)}
        tabs={[
          {
            id: "columns",
            label: "Columns",
            content: <PipelineBoard deals={deals} stages={stages} />,
          },
          {
            id: "list",
            label: "List",
            content: <DealListTable rows={rows} stages={stages} />,
          },
        ]}
      />
      <div className="mt-6">
        <StageEditor stages={stages} />
      </div>
    </AppShell>
  );
}
