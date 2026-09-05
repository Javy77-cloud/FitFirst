import { formatMoney, type TrackingStatus } from "@/lib/domain";
import { matchQuotePdf } from "@/lib/files/quote-match";
import type { TrackingRow, TrackingShop } from "./tracking";

export type QuotePdfDoc = {
  id: string;
  dealId: string | null;
  filename: string;
  docType?: string | null;
  slot?: string | null;
};

export type QuoteIdentity = {
  carrier: string;
  premium: string;
  status: TrackingStatus;
  quoteNumber: string;
};

export function quoteCompareId(row: Pick<TrackingRow, "id" | "quoteId">): string {
  return row.quoteId ?? row.id;
}

export function compareHref(dealId: string, ids: string[]): string {
  const unique = [...new Set(ids.filter(Boolean))];
  const q = unique.length ? `?q=${encodeURIComponent(unique.join(","))}` : "";
  return `/deals/${dealId}/compare${q}`;
}

export function quoteIdentity(
  row: Pick<TrackingRow, "carrierName" | "premium" | "status" | "quoteNumber">,
): QuoteIdentity {
  return {
    carrier: row.carrierName,
    premium: formatMoney(row.premium),
    status: row.status,
    quoteNumber: row.quoteNumber?.trim() || "—",
  };
}

export function selectedSameDeal(rows: Array<Pick<TrackingRow, "dealId">>): string | null {
  const deals = new Set(rows.map((row) => row.dealId));
  if (deals.size !== 1) return null;
  return rows[0]?.dealId ?? null;
}

export function attachQuotePdfs(shops: TrackingShop[], docs: QuotePdfDoc[]): TrackingShop[] {
  const byDeal = new Map<string, QuotePdfDoc[]>();
  for (const doc of docs) {
    if (!doc.dealId) continue;
    const list = byDeal.get(doc.dealId) ?? [];
    list.push(doc);
    byDeal.set(doc.dealId, list);
  }

  return shops.map((shop) => {
    const dealDocs = byDeal.get(shop.dealId) ?? [];
    return {
      ...shop,
      rows: shop.rows.map((row) => {
        const match = matchQuotePdf(
          { quoteNumber: row.quoteNumber },
          { name: row.carrierName },
          dealDocs,
        );
        return {
          ...row,
          pdfDocumentId: match?.id ?? null,
          pdfFilename: match?.filename ?? null,
        };
      }),
    };
  });
}
