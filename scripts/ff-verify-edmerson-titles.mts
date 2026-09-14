import { db } from "../src/lib/db";
import { deals } from "../src/lib/db/schema";
import { or, ilike, eq } from "drizzle-orm";
import { loadRecordValues } from "../src/lib/custom-fields/store";

const ids = [
  "03dccdd7-db06-4c89-9b7a-cf0a2064d044",
  "8f4e7b68-2de3-458e-914b-ba60ea3c47aa",
];
for (const id of ids) {
  const [d] = await db
    .select({
      id: deals.id,
      title: deals.title,
      primaryNamedInsured: deals.primaryNamedInsured,
      leadId: deals.leadId,
    })
    .from(deals)
    .where(eq(deals.id, id));
  if (!d) {
    console.log(JSON.stringify({ id, missing: true }));
    continue;
  }
  const vals = await loadRecordValues(d.id);
  console.log(
    JSON.stringify({
      ...d,
      custom: { first: vals.first_name, last: vals.last_name },
    }),
  );
}
const gloria = await db
  .select({ id: deals.id, title: deals.title, leadId: deals.leadId })
  .from(deals)
  .where(ilike(deals.title, "%Gloria Martinez%"));
console.log("gloria titles", gloria);
const ed = await db
  .select({ id: deals.id, title: deals.title })
  .from(deals)
  .where(ilike(deals.title, "%edmerson%"));
console.log("remaining edmerson titles", ed);
process.exit(0);
