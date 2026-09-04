import Link from "next/link";
import { notFound } from "next/navigation";
import { generateDealProposal } from "@/app/actions/proposals";
import { AppShell } from "@/components/app-shell";
import { CompareTable } from "@/components/quotes/compare-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { getDealWorkspace } from "@/lib/db/queries";
import { compareQuotes } from "@/lib/quotes/gap-notes";
import { isProposalDoc, quotesFromDealRows } from "@/lib/proposals/store";
import { filePreviewHref } from "@/lib/files/urls";
import { isUuid } from "@/lib/ids";
import { DEAL_ID } from "@/lib/fixtures/ids";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DealComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const workspace = await getDealWorkspace(id);
  if (!workspace) notFound();
  const { deal, risk, quotes, logs, docs } = workspace;
  const compared = compareQuotes(
    quotesFromDealRows({ quotes, logs }),
    {
      coverageA: risk?.coverageA ?? deal.coverageAmount ?? null,
      state: deal.state ?? risk?.state ?? "FL",
      line: deal.lineOfBusiness,
      wantsFlood: true,
    },
  );
  const proposals = docs.filter(isProposalDoc);
  const isAna = deal.id === DEAL_ID;

  return (
    <AppShell
      title={`Compare · ${deal.title}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/deals/${deal.id}?tab=quotes`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to Quotes
          </Link>
          <form action={generateDealProposal}>
            <input type="hidden" name="dealId" value={deal.id} />
            <Button type="submit" size="sm">
              Generate branded proposal
            </Button>
          </form>
        </div>
      }
    >
      <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
        Side-by-side premiums and coverage. Gap notes are rule text (higher deductible, no flood,
        lower Coverage A) — not an LLM. Generate a branded PDF and it lands on Deal Attachments.
      </p>
      {isAna ? (
        <p className="mb-3 rounded-md bg-fit-yellow-bg px-3 py-2 text-xs text-fit-yellow">
          Ana Dib HO3. Coverage A is $321,000. Shopping / unbound. Do not bind this shop.
        </p>
      ) : null}

      <CompareTable quotes={compared} />

      {proposals.length > 0 ? (
        <section className="ff-card mt-4 p-4">
          <h2 className="text-sm font-semibold text-navy">Proposals on this deal</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {proposals.map((doc) => (
              <li key={doc.id}>
                <a href={filePreviewHref(doc.id)} className="text-primary hover:underline">
                  {doc.filename}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          No branded proposal attached yet. Generate one to store it on Deal Attachments.
        </p>
      )}
    </AppShell>
  );
}
