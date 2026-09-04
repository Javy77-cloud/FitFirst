import Link from "next/link";
import { Col } from "@/components/column-picker";
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
            <Col table="quotes" col="rank" as="th">Rank</Col>
            <Col table="quotes" col="carrier" as="th">Carrier</Col>
            <Col table="quotes" col="line" as="th">Line</Col>
            <Col table="quotes" col="status" as="th">Status</Col>
            <Col table="quotes" col="premium" as="th">Premium</Col>
            <Col table="quotes" col="quoteNumber" as="th">Quote #</Col>
            <Col table="quotes" col="date" as="th">Date</Col>
            <Col table="quotes" col="links" as="th">Links</Col>
          </tr>
        </thead>
        <tbody>
          {shop.rows.map((row) => (
            <tr key={row.id} id={`track-${row.id}`}>
              <Col
                table="quotes"
                col="rank"
                className="whitespace-nowrap text-xs"
                sortValue={row.cheapestQuotedRank ?? 999}
              >
                {row.cheapestQuotedRank != null ? (
                  <span className={row.cheapestQuotedRank === 1 ? "font-semibold text-navy" : ""}>
                    #{row.cheapestQuotedRank}
                    {row.cheapestQuotedRank === 1 ? " cheapest" : ""}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Col>
              <Col table="quotes" col="carrier" className="font-medium">
                {row.carrierName}
                {row.bindable ? null : row.status === "quoted" ? (
                  <div className="text-[11px] text-fit-flag">Quoted · not bindable</div>
                ) : null}
              </Col>
              <Col table="quotes" col="line">{row.line}</Col>
              <Col table="quotes" col="status" sortValue={row.status}>
                <TrackingStatusBadge status={row.status} />
              </Col>
              <Col table="quotes" col="premium" sortValue={row.premium}>
                {formatMoney(row.premium)}
              </Col>
              <Col table="quotes" col="quoteNumber" className="font-mono text-xs">
                {row.quoteNumber ?? "—"}
              </Col>
              <Col
                table="quotes"
                col="date"
                className="whitespace-nowrap text-xs"
                sortValue={row.attemptedAt.toISOString()}
              >
                {row.attemptedAt.toISOString().slice(0, 10)}
              </Col>
              <Col table="quotes" col="links" className="text-xs">
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
              </Col>
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
