import Link from "next/link";
import { notFound } from "next/navigation";
import { generateDealProposal } from "@/app/actions/proposals";
import { AppShell } from "@/components/app-shell";
import { QuoteCompareBoard } from "@/components/deal/quote-compare-board";
import { StagePill } from "@/components/fit-badge";
import { CompareTable } from "@/components/quotes/compare-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatPersonName } from "@/lib/crm/display";
import { getDealWorkspace } from "@/lib/db/queries";
import { DEAL_ID } from "@/lib/fixtures/ids";
import { filePreviewHref, isProposalAttachment } from "@/lib/files/urls";
import { isUuid } from "@/lib/ids";
import { isProposalDoc, quotesFromDealRows } from "@/lib/proposals/store";
import { collectCompareQuotes, parseSelectedIds } from "@/lib/quotes/compare";
import { compareQuotes } from "@/lib/quotes/gap-notes";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DealQuoteComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; notice?: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { q, notice } = await searchParams;
  const workspace = await getDealWorkspace(id);
  if (!workspace) notFound();

  const quotes = collectCompareQuotes({ quotes: workspace.quotes, logs: workspace.logs });
  const selected = parseSelectedIds(q, quotes.map((row) => row.id));
  const compared = compareQuotes(
    quotesFromDealRows({ quotes: workspace.quotes, logs: workspace.logs }),
    {
      coverageA: workspace.risk?.coverageA ?? workspace.deal.coverageAmount ?? null,
      state: workspace.deal.state ?? workspace.risk?.state ?? "FL",
      line: workspace.deal.lineOfBusiness,
      wantsFlood: true,
    },
  );
  const proposals = workspace.docs
    .filter((doc) => isProposalAttachment(doc) || isProposalDoc(doc))
    .map((doc) => ({
      id: doc.id,
      filename: doc.filename,
      href: filePreviewHref(doc.id),
    }));
  const insured =
    workspace.deal.primaryNamedInsured ||
    (workspace.contact ? formatPersonName(workspace.contact) : null) ||
    workspace.account?.name;
  const isAna = workspace.deal.id === DEAL_ID;

  return (
    <AppShell
      title={`${workspace.deal.title} · Compare`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/deals/${workspace.deal.id}?tab=quotes`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to Quotes
          </Link>
          <form action={generateDealProposal}>
            <input type="hidden" name="dealId" value={workspace.deal.id} />
            <Button type="submit" size="sm">
              Generate branded proposal
            </Button>
          </form>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <StagePill stage={workspace.deal.pipelineStage} />
        {insured ? <span>{insured}</span> : null}
        <span className="text-muted-foreground">
          {quotes.length} quote{quotes.length === 1 ? "" : "s"} you can line up
        </span>
      </div>

      {isAna ? (
        <div className="mb-4 rounded-md bg-fit-yellow-bg px-3 py-2 text-xs text-fit-yellow">
          Ana Dib HO3 fixture. Coverage A is $321,000. Shopping / unbound. Compare the shop —
          do not bind. Quotes are not coverage.
        </div>
      ) : null}

      {notice === "video-saved" ? (
        <p className="mb-3 rounded-md bg-fit-green-bg px-3 py-2 text-sm text-navy">
          Video proposal link saved on this deal.
        </p>
      ) : null}
      {notice === "video-cleared" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Video proposal link cleared.
        </p>
      ) : null}
      {notice === "bad-video-url" ? (
        <p className="mb-3 rounded-md bg-fit-flag-bg px-3 py-2 text-sm text-fit-flag">
          Use an http or https record/upload link. FitFirst does not call Loom.
        </p>
      ) : null}
      {notice === "pick-quotes" ? (
        <p className="mb-3 rounded-md bg-fit-yellow-bg px-3 py-2 text-sm text-fit-yellow">
          Select at least one quote before generating a proposal.
        </p>
      ) : null}

      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Interactive compare for this shop. Tick quotes, read the rule-based gap notes (higher
        deductible, no flood, lower Coverage A), then generate a branded PDF or paste a video
        walkthrough URL onto the deal. No rater. No Loom API. Gap notes are not an LLM.
      </p>

      <div className="mb-6">
        <CompareTable quotes={compared} />
      </div>

      <QuoteCompareBoard
        dealId={workspace.deal.id}
        dealTitle={workspace.deal.title}
        quotes={quotes}
        initialSelectedIds={selected}
        videoProposalUrl={workspace.deal.videoProposalUrl}
        proposals={proposals}
      />
    </AppShell>
  );
}
