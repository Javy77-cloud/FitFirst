import { sql } from "../src/lib/db";
import { formatImportReport, importZohoFolder } from "../src/lib/zoho-import/import";
import { defaultImportDir } from "../src/lib/zoho-import/jsonl";

async function main() {
  const dir = process.argv[2] || defaultImportDir();
  const report = await importZohoFolder(dir);
  console.log(formatImportReport(report));
  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
