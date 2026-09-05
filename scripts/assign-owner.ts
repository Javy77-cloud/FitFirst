import { sql } from "../src/lib/db";
import { assignNullOwners, formatAssignOwnerReport } from "../src/lib/zoho-import/owners";

async function main() {
  const report = await assignNullOwners();
  console.log(formatAssignOwnerReport(report));
  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
