import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  alerts,
  appetiteRules,
  carriers,
  deals,
  leads,
  quoteAttemptLogs,
  reviewTasks,
  risks,
  tenants,
} from "./schema";
import { CARRIER_IDS, DEAL_ID, LEAD_ID, RISK_ID, TENANT_ID } from "../fixtures/ids";

export async function seedIfEmpty() {
  const existing = await db.select().from(tenants).where(eq(tenants.id, TENANT_ID));
  if (existing.length > 0) return { seeded: false };
  await seed();
  return { seeded: true };
}

export async function seed() {
  await db
    .insert(tenants)
    .values({
      id: TENANT_ID,
      tenantId: TENANT_ID,
      name: "Garcia Personal Lines (demo)",
    })
    .onConflictDoNothing();

  await db
    .insert(leads)
    .values({
      id: LEAD_ID,
      tenantId: TENANT_ID,
      firstName: "Maria",
      lastName: "Alvarez",
      email: "maria.alvarez@example.com",
      phone: "321-555-0148",
      source: "referral",
      status: "converted",
      notes: "Palm Bay HO shop. Example fixture from a 2026-09-02 FL HO market pass — not production data.",
      convertedDealId: DEAL_ID,
    })
    .onConflictDoNothing();

  await db
    .insert(deals)
    .values({
      id: DEAL_ID,
      tenantId: TENANT_ID,
      leadId: LEAD_ID,
      title: "Alvarez · Palm Bay HO",
      pipelineStage: "shopping",
      lineOfBusiness: "HO",
      state: "FL",
      notes:
        "1989 frame SFH, 8 mi coast, clay tile + metal, no opening protection, Cov A $321k. Eight markets, zero bindable on the source shop.",
    })
    .onConflictDoNothing();

  await db
    .insert(risks)
    .values({
      id: RISK_ID,
      tenantId: TENANT_ID,
      dealId: DEAL_ID,
      riskType: "property",
      address1: "1842 Seaver Street",
      city: "Palm Bay",
      county: "Brevard",
      state: "FL",
      zip: "32907",
      yearBuilt: 1989,
      construction: "frame",
      occupancy: "owner",
      stories: 1,
      squareFeet: 1680,
      coverageA: 321000,
      roofYear: 1989,
      roofCovering: "clay tile + metal",
      openingProtection: "none",
      pool: false,
      protectionClass: "4",
      milesToCoast: 8,
      mobileHome: false,
    })
    .onConflictDoNothing();

  const carrierRows = [
    {
      id: CARRIER_IDS.qbe,
      name: "QBE",
      writtenLines: ["HO"],
      dontWriteNotes: "Frame within 20 miles of coast.",
      portalStatus: "open",
      fixtureTag: "fl-ho-2026-09-02",
    },
    {
      id: CARRIER_IDS.benchmark,
      name: "Benchmark",
      writtenLines: ["HO"],
      dontWriteNotes: "Aged clay tile roofs.",
      portalStatus: "open",
      fixtureTag: "fl-ho-2026-09-02",
    },
    {
      id: CARRIER_IDS.hadron,
      name: "Hadron",
      writtenLines: ["HO"],
      dontWriteNotes: "Aged clay tile roofs.",
      portalStatus: "open",
      fixtureTag: "fl-ho-2026-09-02",
    },
    {
      id: CARRIER_IDS.hoc,
      name: "Homeowners Choice (HOC)",
      writtenLines: ["HO"],
      dontWriteNotes: "Voluntary new business closed; takeout only.",
      portalStatus: "takeout_only",
      fixtureTag: "fl-ho-2026-09-02",
    },
    {
      id: CARRIER_IDS.vyrd,
      name: "VYRD",
      writtenLines: ["HO"],
      dontWriteNotes: "Voluntary NB closed. Brevard min Cov A $350k.",
      portalStatus: "closed",
      fixtureTag: "fl-ho-2026-09-02",
    },
    {
      id: CARRIER_IDS.tailrow,
      name: "Tailrow",
      writtenLines: ["HO"],
      dontWriteNotes: "RCE / MSB floor — will not write requested Cov A.",
      portalStatus: "open",
      fixtureTag: "fl-ho-2026-09-02",
    },
    {
      id: CARRIER_IDS.geovera,
      name: "GeoVera",
      writtenLines: ["HO"],
      dontWriteNotes: "RCE / MSB floor.",
      portalStatus: "open",
      fixtureTag: "fl-ho-2026-09-02",
    },
    {
      id: CARRIER_IDS.sagesure,
      name: "SageSure",
      writtenLines: ["HO"],
      dontWriteNotes: "RCE / MSB floor.",
      portalStatus: "open",
      fixtureTag: "fl-ho-2026-09-02",
    },
    {
      id: CARRIER_IDS.americanIntegrity,
      name: "American Integrity",
      writtenLines: ["HO"],
      dontWriteNotes: "Roof age + RCS referral; not bindable at desk.",
      portalStatus: "open",
      fixtureTag: "fl-ho-2026-09-02",
    },
    {
      id: CARRIER_IDS.southernOak,
      name: "Southern Oak Surplus (example)",
      writtenLines: ["HO"],
      dontWriteNotes: "Example surplus that will look at older coastal frame. Not a live appointment.",
      portalStatus: "open",
      fixtureTag: "example-green",
    },
  ];

  await db
    .insert(carriers)
    .values(
      carrierRows.map((c) => ({
        ...c,
        tenantId: TENANT_ID,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(appetiteRules)
    .values([
      {
        tenantId: TENANT_ID,
        carrierId: CARRIER_IDS.qbe,
        lineOfBusiness: "HO",
        minCovA: 150000,
        maxCovA: 1500000,
        coastalAllowed: true,
        minMilesToCoast: 20,
        allowedConstruction: ["masonry"],
        mobileAllowed: false,
        notes: "No frame within 20 mi of coast.",
      },
      {
        tenantId: TENANT_ID,
        carrierId: CARRIER_IDS.benchmark,
        lineOfBusiness: "HO",
        minCovA: 200000,
        maxRoofAge: 20,
        allowedRoofCoverings: ["shingle", "metal"],
        coastalAllowed: true,
        mobileAllowed: false,
        notes: "Clay tile over ~20 years is a decline.",
      },
      {
        tenantId: TENANT_ID,
        carrierId: CARRIER_IDS.hadron,
        lineOfBusiness: "HO",
        minCovA: 200000,
        maxRoofAge: 20,
        allowedRoofCoverings: ["shingle", "metal"],
        coastalAllowed: true,
        mobileAllowed: false,
        notes: "Same roof story as Benchmark on this shop.",
      },
      {
        tenantId: TENANT_ID,
        carrierId: CARRIER_IDS.hoc,
        lineOfBusiness: "HO",
        minCovA: 150000,
        coastalAllowed: true,
        mobileAllowed: false,
        notes: "Portal takeout only.",
      },
      {
        tenantId: TENANT_ID,
        carrierId: CARRIER_IDS.vyrd,
        lineOfBusiness: "HO",
        minCovA: 250000,
        countyMinCovA: { Brevard: 350000 },
        coastalAllowed: true,
        mobileAllowed: false,
        notes: "Voluntary NB closed; Brevard $350k minimum.",
      },
      {
        tenantId: TENANT_ID,
        carrierId: CARRIER_IDS.tailrow,
        lineOfBusiness: "HO",
        minCovA: 250000,
        requireReplacementCost: true,
        rceFloorRatio: 0.95,
        coastalAllowed: true,
        mobileAllowed: false,
        notes: "Floor to RCE/MSB.",
      },
      {
        tenantId: TENANT_ID,
        carrierId: CARRIER_IDS.geovera,
        lineOfBusiness: "HO",
        minCovA: 250000,
        requireReplacementCost: true,
        rceFloorRatio: 0.95,
        coastalAllowed: true,
        mobileAllowed: false,
        notes: "Floor to RCE/MSB.",
      },
      {
        tenantId: TENANT_ID,
        carrierId: CARRIER_IDS.sagesure,
        lineOfBusiness: "HO",
        minCovA: 250000,
        requireReplacementCost: true,
        rceFloorRatio: 0.95,
        coastalAllowed: true,
        mobileAllowed: false,
        notes: "Floor to RCE/MSB.",
      },
      {
        tenantId: TENANT_ID,
        carrierId: CARRIER_IDS.americanIntegrity,
        lineOfBusiness: "HO",
        minCovA: 200000,
        maxRoofAge: 15,
        coastalAllowed: true,
        mobileAllowed: false,
        notes: "Roof age + RCS goes to UW referral.",
      },
      {
        tenantId: TENANT_ID,
        carrierId: CARRIER_IDS.southernOak,
        lineOfBusiness: "HO",
        minCovA: 200000,
        maxCovA: 750000,
        minYearBuilt: 1970,
        maxRoofAge: 50,
        allowedRoofCoverings: ["clay tile", "metal", "shingle", "tile"],
        allowedConstruction: ["frame", "masonry"],
        coastalAllowed: true,
        minMilesToCoast: 0,
        mobileAllowed: false,
        notes: "Example green market for filter-first ranking.",
      },
    ])
    .onConflictDoNothing();

  const snap = {
    snapYearBuilt: 1989,
    snapRoofYear: 1989,
    snapRoofCovering: "clay tile + metal",
    snapConstruction: "frame",
    snapOpeningProtection: "none",
    snapOccupancy: "owner",
    snapStories: 1,
    snapPool: false,
    snapProtectionClass: "4",
    snapMilesToCoast: 8,
    snapCity: "Palm Bay",
    snapCounty: "Brevard",
    snapCoverageA: 321000,
  };

  await db
    .insert(quoteAttemptLogs)
    .values([
      {
        tenantId: TENANT_ID,
        dealId: DEAL_ID,
        riskId: RISK_ID,
        carrierId: CARRIER_IDS.qbe,
        lineOfBusiness: "HO",
        result: "declined",
        bindable: false,
        covATried: 321000,
        why: "Frame within 20 miles of coast",
        ...snap,
      },
      {
        tenantId: TENANT_ID,
        dealId: DEAL_ID,
        riskId: RISK_ID,
        carrierId: CARRIER_IDS.benchmark,
        lineOfBusiness: "HO",
        result: "declined",
        bindable: false,
        covATried: 321000,
        why: "37-year clay tile",
        ...snap,
      },
      {
        tenantId: TENANT_ID,
        dealId: DEAL_ID,
        riskId: RISK_ID,
        carrierId: CARRIER_IDS.hadron,
        lineOfBusiness: "HO",
        result: "declined",
        bindable: false,
        covATried: 321000,
        why: "37-year clay tile",
        ...snap,
      },
      {
        tenantId: TENANT_ID,
        dealId: DEAL_ID,
        riskId: RISK_ID,
        carrierId: CARRIER_IDS.hoc,
        lineOfBusiness: "HO",
        result: "takeout_only",
        bindable: false,
        covATried: 321000,
        why: "Portal closed / takeout only",
        ...snap,
      },
      {
        tenantId: TENANT_ID,
        dealId: DEAL_ID,
        riskId: RISK_ID,
        carrierId: CARRIER_IDS.vyrd,
        lineOfBusiness: "HO",
        result: "portal_closed",
        bindable: false,
        covATried: 321000,
        why: "Voluntary NB closed + Brevard min $350k",
        ...snap,
      },
      {
        tenantId: TENANT_ID,
        dealId: DEAL_ID,
        riskId: RISK_ID,
        carrierId: CARRIER_IDS.tailrow,
        lineOfBusiness: "HO",
        result: "floor_only",
        bindable: false,
        covATried: 321000,
        why: "RCE / MSB floor",
        ...snap,
      },
      {
        tenantId: TENANT_ID,
        dealId: DEAL_ID,
        riskId: RISK_ID,
        carrierId: CARRIER_IDS.geovera,
        lineOfBusiness: "HO",
        result: "floor_only",
        bindable: false,
        covATried: 321000,
        why: "RCE / MSB floor",
        ...snap,
      },
      {
        tenantId: TENANT_ID,
        dealId: DEAL_ID,
        riskId: RISK_ID,
        carrierId: CARRIER_IDS.sagesure,
        lineOfBusiness: "HO",
        result: "floor_only",
        bindable: false,
        covATried: 321000,
        why: "RCE / MSB floor",
        ...snap,
      },
      {
        tenantId: TENANT_ID,
        dealId: DEAL_ID,
        riskId: RISK_ID,
        carrierId: CARRIER_IDS.americanIntegrity,
        lineOfBusiness: "HO",
        result: "declined",
        bindable: false,
        covATried: 321000,
        why: "UW referral on roof age + RCS — not bindable",
        ...snap,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(alerts)
    .values([
      {
        tenantId: TENANT_ID,
        kind: "appetite_warning",
        title: "Eight markets, zero bindable",
        body: "Palm Bay Alvarez HO: filter-first would have skipped QBE (frame/coast), Benchmark/Hadron (clay tile age), HOC/VYRD (closed), and the RCE floors. Upload the dec + wind mit, then shop only green markets.",
        severity: "warning",
        entityType: "deal",
        entityId: DEAL_ID,
      },
      {
        tenantId: TENANT_ID,
        kind: "extraction_flag",
        title: "Wind mit handwriting needs a 30-second glance",
        body: "Use the sample handwritten wind mit on the deal. Fields under 80% confidence stay off the master record until you accept them.",
        severity: "info",
        entityType: "deal",
        entityId: DEAL_ID,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(reviewTasks)
    .values([
      {
        tenantId: TENANT_ID,
        dealId: DEAL_ID,
        kind: "30_day",
        title: "30-day shop follow-up · Alvarez Palm Bay",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "open",
      },
    ])
    .onConflictDoNothing();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedIfEmpty()
    .then((r) => {
      console.log(r.seeded ? "Seeded demo tenant and Palm Bay fixture." : "Already seeded.");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
