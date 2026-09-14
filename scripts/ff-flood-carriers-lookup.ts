import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, deals } from "../src/lib/db/schema";
import { matchFloodShopCarriers } from "../src/lib/appetite/javy-flood-shop-list";
import { firstWaveKeys, firstWaveRank } from "../src/lib/appetite/first-wave";

async function main() {
  const floodDeals = await db.select().from(deals).where(eq(deals.lineOfBusiness, "FLOOD"));
  const heather = floodDeals.find(
    (d) =>
      (d.primaryNamedInsured || "").toLowerCase().includes("camirand") ||
      d.title.toLowerCase().includes("camirand") ||
      d.title.toLowerCase().includes("heather"),
  );
  console.log("HEATHER", heather ? { id: heather.id, title: heather.title } : null);
  const rows = await db.select({ id: carriers.id, name: carriers.name }).from(carriers);
  const matched = matchFloodShopCarriers(rows);
  console.log("MATCHED", matched.map((m) => ({ id: m.id, name: m.name })));
  console.log("KEYS", firstWaveKeys("flood"));
  console.log(
    "RANKS",
    matched.map((m) => [m.name, firstWaveRank("FLOOD", m.id, m.name)]),
  );
  console.log("HARTFORD", firstWaveRank("FLOOD", "x", "The Hartford"));
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
