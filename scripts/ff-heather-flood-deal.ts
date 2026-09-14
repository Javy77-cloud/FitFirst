import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { deals, risks, quoteSheets } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { emptySheetValues } from "../src/lib/quote-sheet/catalog";
import { formatDealTitle } from "../src/lib/deals/deal-title";

const TENANT = DEFAULT_TENANT_ID;
const CONTACT = "79cf650c-46fb-4b85-879c-16112c3d2889";
const LEAD = "c3dc59af-8f24-42bd-8f77-48ac8dd50840";
const OWNER = "44444444-4444-4444-8444-444444444401";
const FLOOD_PIPELINE = "55555555-5555-4555-8555-555555555505";
const HOME_DEAL = "5ed997ba-21b5-4a70-bdf8-c78810cc79b1";

async function main() {
  const existing = await db.select().from(deals).where(eq(deals.lineOfBusiness, "FLOOD"));
  const heatherFlood = existing.find((d) => {
    const name = (d.primaryNamedInsured ?? "").toLowerCase();
    const title = d.title.toLowerCase();
    return name.includes("camirand") || title.includes("camirand");
  });
  if (heatherFlood) {
    console.log("ALREADY", heatherFlood.id, heatherFlood.title);
    process.exit(0);
  }

  const [home] = await db.select().from(deals).where(eq(deals.id, HOME_DEAL));
  const [homeRisk] = await db.select().from(risks).where(eq(risks.dealId, HOME_DEAL));
  const homeSheets = await db.select().from(quoteSheets).where(eq(quoteSheets.dealId, HOME_DEAL));
  const homeSheet = homeSheets.find((s) => s.line === "home") ?? homeSheets[0];
  const homeVals = (homeSheet?.values ?? {}) as Record<string, { value?: string }>;
  const cell = (k: string) => String(homeVals[k]?.value ?? "").trim();

  const title = formatDealTitle({
    firstName: "Heather",
    lastName: "Camirand",
    line: "FLOOD",
  });

  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: TENANT,
      leadId: LEAD,
      contactId: CONTACT,
      title,
      pipelineStage: "shopping",
      pipelineId: FLOOD_PIPELINE,
      pipelineStageSlug: "gather",
      lineOfBusiness: "FLOOD",
      quotingForm: "FLOOD",
      quotingLine: "flood",
      policySubType: "Flood",
      state: "FL",
      ownerId: OWNER,
      accountKind: "personal",
      bindTarget: "contact",
      primaryNamedInsured: "Heather Camirand",
      propertyOneliner: home?.propertyOneliner ?? "5181 Tallwood Cir, West Melbourne, FL 32904",
      coverageAmount: home?.coverageAmount ?? homeRisk?.coverageA ?? null,
      source: "manual",
    })
    .returning();

  await db.insert(risks).values({
    tenantId: TENANT,
    dealId: deal.id,
    contactId: CONTACT,
    riskType: "property",
    address1: homeRisk?.address1 ?? "5181 Tallwood Cir",
    city: homeRisk?.city ?? "West Melbourne",
    county: homeRisk?.county ?? "Brevard",
    state: homeRisk?.state ?? "FL",
    zip: homeRisk?.zip ?? "32904",
    yearBuilt: homeRisk?.yearBuilt ?? null,
    construction: homeRisk?.construction ?? null,
    occupancy: homeRisk?.occupancy ?? null,
    stories: homeRisk?.stories ?? null,
    squareFeet: homeRisk?.squareFeet ?? null,
    coverageA: homeRisk?.coverageA ?? null,
  });

  const values = emptySheetValues("flood", "flood");
  const put = (key: string, value: string) => {
    if (!value) return;
    if (!values[key]) {
      values[key] = { value, status: "confirmed", source: "agent" };
      return;
    }
    values[key] = { value, status: "confirmed", source: "agent" };
  };

  put("applicant_name", "Heather Camirand");
  put("named_insured", "Heather Camirand");
  put("property_address", home?.propertyOneliner ?? "5181 Tallwood Cir, West Melbourne, FL 32904");
  put("mailing_address", "5181 Tallwood Cir");
  put("city", "West Melbourne");
  put("state", "FL");
  put("zip", "32904");
  put("year_built", homeRisk?.yearBuilt ? String(homeRisk.yearBuilt) : cell("year_built"));
  put(
    "building_sqft",
    homeRisk?.squareFeet
      ? String(homeRisk.squareFeet)
      : cell("square_feet") || cell("sqft") || cell("living_area"),
  );
  put("number_of_floors", homeRisk?.stories ? String(homeRisk.stories) : cell("stories"));
  put(
    "construction_type",
    homeRisk?.construction ?? (cell("construction") || cell("construction_type")),
  );
  put("flood_zone", cell("flood_zone"));
  put("firm_panel", cell("firm_panel"));
  put("bfe", cell("bfe"));
  put("foundation", cell("foundation"));
  put(
    "building_limit",
    homeRisk?.coverageA ? String(homeRisk.coverageA) : cell("coverage_a"),
  );

  await db.insert(quoteSheets).values({
    tenantId: TENANT,
    dealId: deal.id,
    line: "flood",
    values,
  });

  const seeded = Object.entries(values)
    .filter(([, c]) => c.value.trim())
    .map(([k, c]) => `${k}=${c.value}`);

  console.log(
    JSON.stringify(
      {
        dealId: deal.id,
        title: deal.title,
        url: `http://localhost:43147/deals/${deal.id}?tab=documents`,
        seeded,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
