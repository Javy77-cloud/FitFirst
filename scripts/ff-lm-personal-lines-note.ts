import { eq, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers } from "../src/lib/db/schema";

async function main() {
  const rows = await db
    .select()
    .from(carriers)
    .where(
      or(
        ilike(carriers.name, "Liberty Mutual"),
        ilike(carriers.name, "%Liberty%Mutual%"),
        ilike(carriers.name, "LM"),
      ),
    );
  const carrier =
    rows.find((c) => /liberty\s*mutual/i.test(c.name)) ??
    rows.find((c) => /^lm$/i.test(c.name.trim())) ??
    rows[0];
  if (!carrier) throw new Error("LM not found");
  const note =
    "Auto / Personal Lines ONLY — do NOT use Small Business portal. Heather Auto shop = personal lines.";
  await db
    .update(carriers)
    .set({
      portalLogin: (carrier as any).portalLogin || "personal lines",
      // keep any existing URL; note quirk in portalLogin suffix if blank-ish
      updatedAt: new Date(),
    } as any)
    .where(eq(carriers.id, carrier.id));
  // Prefer bindNotes / quirks column if present
  const cols = Object.keys(carrier);
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (cols.includes("bindNotes")) patch.bindNotes = note;
  else if (cols.includes("notes")) patch.notes = note;
  else if (cols.includes("portalNotes")) patch.portalNotes = note;
  else if (cols.includes("agentNotes")) patch.agentNotes = note;
  else patch.portalLogin = `${(carrier as any).portalLogin || ""} | ${note}`.trim();
  await db.update(carriers).set(patch as any).where(eq(carriers.id, carrier.id));
  console.log(JSON.stringify({ id: carrier.id, name: carrier.name, patchKeys: Object.keys(patch) }));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
