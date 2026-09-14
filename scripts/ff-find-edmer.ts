import { db } from "../src/lib/db";
import { leads } from "../src/lib/db/schema";
import { or, ilike, sql, isNotNull, eq } from "drizzle-orm";

async function main() {
  const nameMatch = await db
    .select()
    .from(leads)
    .where(
      or(
        ilike(leads.firstName, "%edmer%"),
        ilike(leads.lastName, "%edmer%"),
        ilike(leads.firstName, "%edward%"),
        ilike(leads.lastName, "%edward%"),
        ilike(leads.firstName, "%edmerson%"),
        ilike(leads.lastName, "%edmerson%"),
      ),
    );

  console.log("--- name matches ---");
  for (const r of nameMatch) {
    console.log(
      JSON.stringify({
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
        status: r.status,
        archivedAt: r.archivedAt,
        temperature: r.temperature,
        email: r.email,
        phone: r.phone,
        updatedAt: r.updatedAt,
      }),
    );
  }

  // broader: first name starts with Ed
  const edStarts = await db
    .select()
    .from(leads)
    .where(ilike(leads.firstName, "ed%"));
  console.log("--- first name ed% ---");
  for (const r of edStarts) {
    console.log(
      JSON.stringify({
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
        status: r.status,
        archivedAt: r.archivedAt,
        temperature: r.temperature,
        email: r.email,
        phone: r.phone,
        updatedAt: r.updatedAt,
      }),
    );
  }

  const lostOrArchived = await db
    .select()
    .from(leads)
    .where(or(eq(leads.status, "lost"), eq(leads.status, "Lost"), isNotNull(leads.archivedAt)));

  console.log("--- all lost/archived leads ---");
  for (const r of lostOrArchived) {
    console.log(
      JSON.stringify({
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
        status: r.status,
        archivedAt: r.archivedAt,
        temperature: r.temperature,
        email: r.email,
        phone: r.phone,
        updatedAt: r.updatedAt,
      }),
    );
  }

  const statuses = await db.execute(
    sql`select distinct status, count(*)::int as n from leads group by status order by n desc`,
  );
  console.log("--- statuses ---", statuses);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
