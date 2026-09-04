import { isQuoteAttachment } from "./urls";

export function carrierFilenameSlug(name: string): string {
  return name.toLowerCase().replace(/[^\w]+/g, "_").replace(/^_|_$/g, "");
}

export function matchQuotePdf<
  T extends { filename: string; docType?: string | null; slot?: string | null },
>(
  quote: { quoteNumber?: string | null },
  carrier: { name: string },
  docs: T[],
): T | undefined {
  const quoteDocs = docs.filter((doc) => isQuoteAttachment(doc));
  if (quoteDocs.length === 0) return undefined;

  const number = (quote.quoteNumber ?? "").toLowerCase().trim();
  if (number) {
    const compact = number.replace(/[^\w]+/g, "_");
    const byNumber = quoteDocs.find((doc) => {
      const name = doc.filename.toLowerCase();
      return name.includes(number) || name.includes(compact);
    });
    if (byNumber) return byNumber;
  }

  const slug = carrierFilenameSlug(carrier.name);
  const bySlug = quoteDocs.find((doc) => carrierFilenameSlug(doc.filename).includes(slug));
  if (bySlug) return bySlug;

  const tokens = carrier.name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
  return quoteDocs.find((doc) => {
    const name = doc.filename.toLowerCase();
    return tokens.length > 0 && tokens.every((token) => name.includes(token));
  });
}
