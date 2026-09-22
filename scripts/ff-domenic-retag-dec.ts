/**
 * Retag Domenic Iori Travelers mint DEC current_policy → policy_dec.
 * Usage: npx tsx --env-file=.env scripts/ff-domenic-retag-dec.ts
 */
import { ensureDomenicMintDecRetag } from "@/app/actions/policy-files";

async function main() {
  const result = await ensureDomenicMintDecRetag();
  console.log(result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
