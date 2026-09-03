import Link from "next/link";
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
  if (shop.rows.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground">
        No shops recorded on this deal. Filter markets first, then log the attempt. This board
        does not call a rater.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="ff-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Carrier</th>
            <th>Line</th>
            <th>Status</th>
            <th>Premium</th>
            <th>Quote #</th>
            <th>Date</th>
            <th>Links</th>
          </tr>
        </thead>
        <tbody>
          {shop.rows.map((row) => (
            <tr key={row.id} id={`track-${row.id}`}>
              <td className="whitespace-nowrap text-xs">
                {row.cheapestQuotedRank != null ? (
                  <span className={row.cheapestQuotedRank === 1 ? "font-semibold text-navy" : ""}>
                    #{row.cheapestQuotedRank}
                    {row.cheapestQuotedRank === 1 ? " cheapest" : ""}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="font-medium">
                {row.carrierName}
                {row.bindable ? null : row.status === "quoted" ? (
                  <div className="text-[11px] text-fit-flag">Quoted · not bindable</div>
                ) : null}
              </td>
              <td>{row.line}</td>
              <td>
                <TrackingStatusBadge status={row.status} />
              </td>
              <td>{formatMoney(row.premium)}</td>
              <td className="font-mono text-xs">{row.quoteNumber ?? "—"}</td>
              <td className="whitespace-nowrap text-xs">
                {row.attemptedAt.toISOString().slice(0, 10)}
              </td>
              <td className="text-xs">
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  {showDealLink ? (
                    <Link
                      href={`/deals/${row.dealId}?tab=quotes`}
                      className="text-primary hover:underline"
                    >
                      Deal
                    </Link>
                  ) : null}
                  {row.appetiteLogId ? (
                    <Link
                      href={`/logs#log-${row.appetiteLogId}`}
                      className="text-primary hover:underline"
                    >
                      Appetite log
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">No log</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ShopSummary({ shop }: { shop: TrackingShop }) {
  return (
    <p className="text-xs text-muted-foreground">
      {shop.quotedCount} quoted · {shop.declinedCount} declined · {shop.skipCount} skip ·{" "}
      {shop.boundCount} bound. Cheapest quoted: {cheapestQuotedSummary(shop)}.
    </p>
  );
}
