import Link from "next/link";
import { ColumnTable } from "@/components/lists/column-table";
import { TrackingStatusBadge } from "@/components/quotes/status-badge";
import { formatMoney } from "@/lib/domain";
import { cheapestQuotedSummary, type TrackingShop } from "@/lib/quotes/tracking";

export function TrackingTable({
  shop,
  showDealLink = false,
}: {
  shop: TrackingShop;
  showDealLink?: boolean;
}) {
  return (
    <ColumnTable
      moduleId="quotes"
      columns={[
        { id: "rank", label: "Rank" },
        { id: "carrier", label: "Carrier", locked: true },
        { id: "line", label: "Line" },
        { id: "status", label: "Status" },
        { id: "premium", label: "Premium" },
        { id: "quoteNumber", label: "Quote #" },
        { id: "date", label: "Date" },
        { id: "links", label: "Links" },
      ]}
      empty="No shops recorded on this deal. Filter markets first, then log the attempt. This board does not call a rater."
      rows={shop.rows.map((row) => ({
        key: row.id,
        id: `track-${row.id}`,
        cells: {
          rank: (
            <span className="whitespace-nowrap text-xs">
              {row.cheapestQuotedRank != null ? (
                <span className={row.cheapestQuotedRank === 1 ? "font-semibold text-navy" : ""}>
                  #{row.cheapestQuotedRank}
                  {row.cheapestQuotedRank === 1 ? " cheapest" : ""}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </span>
          ),
          carrier: (
            <div className="font-medium">
              {row.carrierName}
              {!row.bindable && row.status === "quoted" ? (
                <div className="text-base text-fit-flag">Quoted · not bindable</div>
              ) : null}
            </div>
          ),
          line: row.line,
          status: <TrackingStatusBadge status={row.status} />,
          premium: formatMoney(row.premium),
          quoteNumber: <span className="font-mono text-xs">{row.quoteNumber ?? "—"}</span>,
          date: (
            <span className="whitespace-nowrap text-xs">
              {row.attemptedAt.toISOString().slice(0, 10)}
            </span>
          ),
          links: (
            <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs">
              {showDealLink ? (
                <Link
                  href={`/deals/${row.dealId}?tab=quotes`}
                  className="text-primary hover:underline"
                >
                  Deal
                </Link>
              ) : null}
              {row.appetiteLogId ? (
                <Link href={`/logs#log-${row.appetiteLogId}`} className="text-primary hover:underline">
                  Appetite log
                </Link>
              ) : (
                <span className="text-muted-foreground">No log</span>
              )}
            </div>
          ),
        },
      }))}
    />
  );
}

export function ShopSummary({ shop }: { shop: TrackingShop }) {
  return (
    <p className="text-base text-muted-foreground">
      {shop.quotedCount} quoted · {shop.declinedCount} declined · {shop.skipCount} skip ·{" "}
      {shop.boundCount} bound. Cheapest quoted: {cheapestQuotedSummary(shop)}.
    </p>
  );
}
