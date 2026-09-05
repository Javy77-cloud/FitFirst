import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { QuoteBoard } from "@/components/quotes/quote-board";
import { buttonVariants } from "@/components/ui/button";
import { listEnabledMacrosFor } from "@/lib/db/developer-hub-queries";
import { listQuoteTrackingShops } from "@/lib/db/queries";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { DEAL_STAGES, LINES } from "@/lib/domain";
import { matchesField, pickFilterParams, uniqueOptions } from "@/lib/saved-filters";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function QuotesBoardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const deal = Array.isArray(params.deal) ? params.deal[0] : params.deal;
  const filter = pickFilterParams(params, ["stage", "line"]);
  const [all, macros] = await Promise.all([
    listQuoteTrackingShops(deal || undefined),
    listEnabledMacrosFor("quotes"),
  ]);
  const shops = all.filter(
    (shop) => matchesField(shop.dealStage, filter.stage) && matchesField(shop.line, filter.line),
  );

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
        Every shop already run — appetite logs and quote comparison rows — in one place. Collapse
        a card and you still see carrier, premium, status, and quote #. Expand for the rest.
        Compare, PDF, email/SMS stub, open deal, and appetite log live in each card’s Actions
        menu. Tick quotes in Bulk to compare. This board does not call a carrier or rater.
      </p>

      <SavedFiltersBar
        moduleId="quotes"
        fields={[
          {
            key: "stage",
            label: "Stage",
            options: uniqueOptions(
              all.map((shop) => shop.dealStage),
              DEAL_STAGES.map((value) => ({ value, label: value.replaceAll("_", " ") })),
            ),
          },
          {
            key: "line",
            label: "Line",
            options: uniqueOptions(
              all.map((shop) => shop.line),
              LINES.map((value) => ({ value, label: value })),
            ),
          },
        ]}
      />

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
        <QuoteBoard
          shops={shops}
          focusedDeal={Boolean(deal)}
          macros={macros.map((macro) => ({ id: macro.id, name: macro.name }))}
        />
      )}
    </AppShell>
  );
}
