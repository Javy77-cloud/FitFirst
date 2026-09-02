import { seedIfEmpty } from "../src/lib/db/seed";
import { sql } from "../src/lib/db";

async function main() {
  const result = await seedIfEmpty();
  console.log(result.seeded ? "Seeded demo tenant and Palm Bay fixture." : "Already seeded.");
  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
