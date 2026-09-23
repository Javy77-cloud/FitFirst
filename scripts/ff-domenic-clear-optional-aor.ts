/**
 * Close leftover Collect AOR tasks on Domenic Iori Travelers (optional packet).
 * Usage: npx tsx --env-file=.env scripts/ff-domenic-clear-optional-aor.ts
 */
import { ensureDomenicOptionalAorCleared } from "@/app/actions/policy-files";

async function main() {
  const result = await ensureDomenicOptionalAorCleared();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
