import { and, eq, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quoteSheets } from "../src/lib/db/schema";
import { writePortalUsername } from "../src/lib/carriers/secrets";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const PORTAL = "https://sales.geico.com/quote";
const USER = "j000822";

async function setHeatherOwnRent() {
  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, DEAL), eq(quoteSheets.line, "auto")));
  if (!sheet) throw new Error("no auto sheet for Heather deal");
  const values = { ...(sheet.values as Record<string, any>) };
  values.own_rent = {
    value: "Own",
    source: "agent",
    status: "confirmed",
  };
  await db
    .update(quoteSheets)
    .set({ values, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheet.id));
  return { sheetId: sheet.id, own_rent: values.own_rent };
}

async function setGeicoPortal() {
  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "%Geico%"), ilike(carriers.name, "%GEICO%")));
  if (!rows.length) throw new Error("Geico carrier not found");
  const user = writePortalUsername(USER);
  const updated: Array<{ id: string; name: string; hint: string | null }> = [];
  for (const c of rows) {
    await db
      .update(carriers)
      .set({
        agentPortalUrl: PORTAL,
        portalUrl: PORTAL,
        ...user,
        portalPasswordEnc: null,
        portalPasswordIv: null,
        portalSecretsUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(carriers.id, c.id));
    updated.push({ id: c.id, name: c.name, hint: user.portalUsernameHint });
  }
  return updated;
}

async function main() {
  const heather = await setHeatherOwnRent();
  const geico = await setGeicoPortal();
  console.log(JSON.stringify({ heather, geico, portal: PORTAL }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
