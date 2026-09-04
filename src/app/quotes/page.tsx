import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ShopSummary, TrackingTable } from "@/components/quotes/tracking-table";
import { StagePill } from "@/components/fit-badge";
import { buttonVariants } from "@/components/ui/button";
import { listQuoteTrackingShops } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function QuotesBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ deal?: string }>;
}) {
  const { deal } = await searchParams;
  const shops = await listQuoteTrackingShops(deal || undefined);

  return (
    <AppShell
      title="Quote tracking"
      actions={
        <Link href="/deals/new" className={cn(buttonVariants({ size: "sm" }))}>
          New shopping deal
        </Link>
      }
    >
      <p className="mb-3 max-w-3xl text-base text-muted-foreground">
        Every shop already run — appetite logs and quote comparison rows — in one place. Status
        is quoted, declined, skip, or bound. Cheapest quoted is ranked per deal. This board does
        not call a carrier or rater.
      </p>

      {deal ? (
        <p className="mb-3 text-xs">
          Showing one deal.{" "}
          <Link href="/quotes" className="text-primary hover:underline">
            All shops
          </Link>
        </p>
      ) : null}

      {shops.length === 0 ? (
        <section className="ff-card px-4 py-8 text-base text-muted-foreground">
          No quote attempts on the book yet. Open a deal, filter markets, then log the shop.
        </section>
      ) : (
        <div className="space-y-4">
          {shops.map((shop) => (
            <section key={shop.dealId} className="ff-card overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/deals/${shop.dealId}?tab=quotes`}
                      className="text-base font-semibold text-navy hover:underline"
                    >
                      {shop.dealTitle}
                    </Link>
                    <StagePill stage={shop.dealStage} />
                    <span className="text-xs text-muted-foreground">{shop.line}</span>
                  </div>
                  <div className="mt-1">
                    <ShopSummary shop={shop} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Link href={`/deals/${shop.dealId}?tab=quotes`} className="text-primary hover:underline">
                    Open deal
                  </Link>
                  <Link href={`/quotes?deal=${shop.dealId}`} className="text-primary hover:underline">
                    This shop only
                  </Link>
                </div>
              </div>
              <TrackingTable shop={shop} showDealLink />
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}
