/**
 * Book HO3 Fill-from-DEC.
 * Thin wrapper around the book script. Forces --family ho3.
 * Dry-run is the default. --apply overwrites, same as Confirm on the desk.
 *
 *   npx tsx --env-file=.env scripts/ff-fill-ho3-from-dec.ts
 *   npx tsx --env-file=.env scripts/ff-fill-ho3-from-dec.ts --apply
 *   npx tsx --env-file=.env scripts/ff-fill-ho3-from-dec.ts --policy <uuid>
 */
import { run } from "./ff-fill-book-from-dec";

function forceFamilyHo3() {
  const index = process.argv.indexOf("--family");
  if (index === -1) {
    process.argv.push("--family", "ho3");
    return;
  }
  const next = process.argv[index + 1];
  if (!next || next.startsWith("--")) {
    process.argv.splice(index + 1, 0, "ho3");
    return;
  }
  process.argv[index + 1] = "ho3";
}

forceFamilyHo3();
run();
