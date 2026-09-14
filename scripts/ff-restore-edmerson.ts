import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { leads } from "../src/lib/db/schema";

const ID = "d9450a22-ca5b-423f-8203-34c96aefffcc";

async function main() {
  const [before] = await db.select().from(leads).where(eq(leads.id, ID));
  if (!before) throw new Error("lead not found");
  console.log("before", {
    name: `${before.firstName} ${before.lastName}`,
    status: before.status,
    archivedAt: before.archivedAt,
    temperature: before.temperature,
  });

  await db
    .update(leads)
    .set({
      status: "in_progress",
      archivedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, ID));

  const [after] = await db.select().from(leads).where(eq(leads.id, ID));
  console.log("after", {
    name: `${after.firstName} ${after.lastName}`,
    status: after.status,
    archivedAt: after.archivedAt,
    temperature: after.temperature,
    email: after.email,
    phone: after.phone,
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
