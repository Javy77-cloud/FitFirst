/**
 * Read-only report of deals whose insurance forms still share one risk,
 * one home quote sheet, or documents without a product instance tag.
 *
 * Does not update, insert, or delete anything.
 *
 *   npx tsx scripts/report-shared-product-scope.ts
 *
 * DATABASE_URL is required. When it is unset this script prints a notice and
 * exits 0. It does not fall back to a local database.
 *
 * Do not run this against production until the owner asks. Migrations
 * 0157_risk_product_key and 0158_document_product_key must not be applied
 * until the owner approves them.
 */
const PROPERTY_PRODUCTS = new Set(["homeowners", "landlord", "renters", "flood"]);
const AUTO_PRODUCTS = new Set(["auto", "motorcycle", "commercial_auto"]);

type DealRow = {
  id: string;
  title: string | null;
  shop_products: string[] | null;
};

function productIdOf(token: string): string {
  const head = token.split("~")[0] ?? token;
  return head.trim();
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.log(
      "DATABASE_URL is not set. Shared-product report skipped. No database was contacted.",
    );
    return;
  }
  const postgres = (await import("postgres")).default;
  const sql = postgres(url, { max: 1, prepare: false });
  try {
    const riskColumn = await sql<{ exists: boolean }[]>`
      select exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'risks' and column_name = 'product_key'
      ) as exists
    `;
    const docColumn = await sql<{ exists: boolean }[]>`
      select exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'documents' and column_name = 'product_key'
      ) as exists
    `;
    const risksHaveKey = Boolean(riskColumn[0]?.exists);
    const docsHaveKey = Boolean(docColumn[0]?.exists);
    console.log(`risks.product_key present: ${risksHaveKey}`);
    console.log(`documents.product_key present: ${docsHaveKey}`);
    console.log("Read only. No rows were changed.");

    const deals = await sql<DealRow[]>`
      select id, title, shop_products
      from deals
      where shop_products is not null
      order by created_at asc
    `;
    let listed = 0;
    for (const deal of deals) {
      const tokens = (deal.shop_products ?? []).map((row) => String(row));
      const propertyTokens = tokens.filter((token) => PROPERTY_PRODUCTS.has(productIdOf(token)));
      const autoTokens = tokens.filter((token) => AUTO_PRODUCTS.has(productIdOf(token)));
      if (propertyTokens.length < 2 && autoTokens.length < 2) continue;
      listed += 1;
      const risks = risksHaveKey
        ? await sql<{ n: number; unscoped: number }[]>`
            select count(*)::int as n,
                   count(*) filter (where product_key is null)::int as unscoped
            from risks
            where deal_id = ${deal.id}
          `
        : await sql<{ n: number; unscoped: number }[]>`
            select count(*)::int as n, count(*)::int as unscoped
            from risks
            where deal_id = ${deal.id}
          `;
      const sheets = await sql<{ line: string }[]>`
        select line from quote_sheets where deal_id = ${deal.id} order by line
      `;
      const docs = await sql<{ tags: string[] | null }[]>`
        select tags from documents where deal_id = ${deal.id}
      `;
      const sharedHome =
        propertyTokens.some((token) => productIdOf(token) === "homeowners") &&
        propertyTokens.some((token) => productIdOf(token) === "landlord") &&
        sheets.some((row) => row.line === "home") &&
        !sheets.some((row) => row.line === "home~landlord");
      const untagged = docs.filter((doc) => {
        const tags = doc.tags ?? [];
        return tags.some((tag) => tag.startsWith("line:")) && !tags.some((tag) => tag.startsWith("instance:"));
      }).length;
      const risk = risks[0];
      console.log(
        [
          `deal ${deal.id}`,
          `title ${deal.title ?? ""}`.trim(),
          `products ${tokens.join(",")}`,
          `risks ${risk?.n ?? 0}`,
          `unscoped_risks ${risk?.unscoped ?? 0}`,
          `sheets ${sheets.map((row) => row.line).join(",") || "(none)"}`,
          `documents ${docs.length}`,
          `line_docs_without_instance ${untagged}`,
          `shared_home_sheet ${sharedHome ? "yes" : "no"}`,
        ].join(" | "),
      );
    }
    console.log(`affected deals: ${listed}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
