import { seedIfEmpty } from "../src/lib/db/seed";
import { sql } from "../src/lib/db";

async function main() {
  const result = await seedIfEmpty();
  console.log(
    "Loaded Ana Dib HO3 shop, Ortega Melbourne fill-demo, and Francisco Javier Garcia HO/Auto shop.",
  );
  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
