import { sql } from "../src/lib/db";
import { formatWipeReport, wipeCrmDemo } from "../src/lib/zoho-import/wipe";

async function main() {
  const result = await wipeCrmDemo();
  console.log(formatWipeReport(result));
  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
