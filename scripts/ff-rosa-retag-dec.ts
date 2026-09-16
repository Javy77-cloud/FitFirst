/**
 * Retag Rosa Castellanos' Florida Peninsula dec so Create policy / Issue can use it.
 * Usage: npx tsx --env-file=.env scripts/ff-rosa-retag-dec.ts
 */
import { ensureRosaDeclarationRetag } from "@/app/actions/declaration";

async function main() {
  const result = await ensureRosaDeclarationRetag();
  console.log(result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
