import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DealFilters } from "@/components/crm/deal-filters";
import { DealListTable } from "@/components/crm/deal-list-table";
import { PipelineBoard } from "@/components/crm/pipeline-board";
import { QueryTabs, resolveQueryTab } from "@/components/crm/query-tabs";
import { StageEditor } from "@/components/crm/stage-editor";
import { buttonVariants } from "@/components/ui/button";
import { parseDealFilter } from "@/lib/crm/lists";
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
  const active = resolveQueryTab(VIEWS, params.view);

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
        Same shops as the list. Filter once. Dial or copy from the card — do not open a record to
        grab a phone number. Bound is locked.
      </p>
      <div className="mb-3">
        <DealFilters pathname="/pipeline" view={active} filter={filter} stages={stages} />
      </div>
      <QueryTabs
        pathname="/pipeline"
        param="view"
        extra={extra}
        active={active}
        tabs={[
          {
            id: "columns",
            label: "Columns",
            content: <PipelineBoard rows={rows} stages={stages} filter={filter} />,
          },
          {
            id: "list",
            label: "List",
            content: (
              <DealListTable
                rows={rows}
                stages={stages}
                filter={filter}
                filterPath="/pipeline"
                filterView="list"
                showFilters={false}
              />
            ),
          },
        ]}
      />
      <div className="mt-6">
        <StageEditor stages={stages} />
      </div>
    </AppShell>
  );
}
