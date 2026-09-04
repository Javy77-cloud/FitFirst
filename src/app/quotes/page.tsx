import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ColumnPicker } from "@/components/column-picker";
import { DeskDetails } from "@/components/desk-details";
import { ShopSummary, TrackingTable } from "@/components/quotes/tracking-table";
import { StagePill } from "@/components/fit-badge";
import { buttonVariants } from "@/components/ui/button";
import { defaultColumns } from "@/lib/desk/columns";
import { listQuoteTrackingShops } from "@/lib/db/queries";
import { shopSectionOpen } from "@/lib/quotes/collapse";
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
      title="Quotes"
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/quotes/fill-feedback" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Fill Feedback log
          </Link>
          <Link href="/deals/new" className={cn(buttonVariants({ size: "sm" }))}>
            New shopping deal
          </Link>
        </div>
      }
      columns={<ColumnPicker tableKey="quotes" initial={defaultColumns("quotes")} />}
    >
      <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
        Every shop already run — appetite logs and quote comparison rows — in one place. Status
        is quoted, declined, skip, or bound. Cheapest quoted is ranked per deal. Fold a shop you
        are not working. This board does not call a carrier or rater. Mapped-field corrections
        live on the Fill Feedback log — rule/log based, not ML.
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
        <section className="ff-card px-4 py-8 text-sm text-muted-foreground">
          No quote attempts on the book yet. Open a deal, filter markets, then log the shop.
        </section>
      ) : (
        <div className="space-y-4">
          {shops.map((shop) => (
            <DeskDetails
              key={shop.dealId}
              open={shopSectionOpen(shop, Boolean(deal))}
              padded={false}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {shop.dealTitle}
                  <StagePill stage={shop.dealStage} />
                  <span className="font-normal text-xs text-muted-foreground">{shop.line}</span>
                </span>
              }
              summary={<ShopSummary shop={shop} />}
            >
              <div className="flex flex-wrap gap-3 border-b border-border px-4 py-2 text-xs">
                <Link href={`/deals/${shop.dealId}?tab=quotes`} className="text-primary hover:underline">
                  Open deal
                </Link>
                <Link href={`/quotes?deal=${shop.dealId}`} className="text-primary hover:underline">
                  This shop only
                </Link>
              </div>
              <TrackingTable shop={shop} showDealLink />
            </DeskDetails>
          ))}
        </div>
      )}
    </AppShell>
  );
}
