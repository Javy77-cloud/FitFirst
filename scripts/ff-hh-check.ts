import { eq, and } from "drizzle-orm";
import { db } from "./src/lib/db";
import { quoteSheets } from "./src/lib/db/schema";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";

async function main() {
  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, DEAL), eq(quoteSheets.line, "auto")));
  if (!sheet) throw new Error("no sheet");
  const values = sheet.values as Record<string, any>;
  const keys = Object.keys(values).filter(
    (k) => /household|driver|exclu|resident|occupant/i.test(k),
  );
  const hits = keys.map((k) => ({ k, v: values[k]?.value ?? values[k] }));
  const nameHits = Object.entries(values)
    .filter(([_, v]) =>
      /christopher|breeah|brooke|camirand/i.test(String((v as any)?.value ?? v)),
    )
    .map(([k, v]) => ({ k, v: (v as any)?.value ?? v }));
  console.log(JSON.stringify({ keyCount: keys.length, hits, nameHits }, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
