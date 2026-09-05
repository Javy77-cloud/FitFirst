import { and, eq, inArray } from "drizzle-orm";
import { db } from "./index";
import {
  alerts,
  carriers,
  clientHistory,
  contacts,
  deals,
  policies,
  policyTerms,
  renewalCompareLogs,
  reviewTasks,
  risks,
  type PolicyCoverageLine,
} from "./schema";
import {
  BOOK_CARRIER_IDS,
  HALE_COMPARE_LOG_ID,
  HALE_CONTACT_ID,
  HALE_CURRENT_TERM_ID,
  HALE_DEAL_ID,
  HALE_POLICY_ID,
  HALE_PROPOSED_TERM_ID,
  HALE_RISK_ID,
  NAIR_COMPARE_LOG_ID,
  NAIR_CONTACT_ID,
  NAIR_CURRENT_TERM_ID,
  NAIR_DEAL_ID,
  NAIR_POLICY_ID,
  NAIR_PROPOSED_TERM_ID,
  NAIR_RISK_ID,
  TENANT_ID,
} from "../fixtures/ids";
import {
  buildCompareSnapshot,
  compareSummary,
  coverageRows,
  premiumChange,
} from "../renewal/compare";

const HALE_CURRENT_PREMIUM = "2184.00";
const HALE_PROPOSED_PREMIUM = "2547.00";
const NAIR_CURRENT_PREMIUM = "1428.00";
const NAIR_PROPOSED_PREMIUM = "1356.00";

const haleCurrentCoverages: PolicyCoverageLine[] = [
  { key: "cov_a", label: "Coverage A — Dwelling", value: "$275,000" },
  { key: "cov_b", label: "Coverage B — Other structures", value: "$27,500" },
  { key: "cov_c", label: "Coverage C — Personal property", value: "$137,500" },
  { key: "cov_d", label: "Coverage D — Loss of use", value: "$55,000" },
  { key: "liability", label: "Section II liability", value: "$300,000" },
  { key: "med_pay", label: "Medical payments", value: "$5,000" },
  { key: "ord_law", label: "Ordinance or law", value: "25%" },
  { key: "water_backup", label: "Water backup", value: "$10,000" },
];

const haleProposedCoverages: PolicyCoverageLine[] = [
  { key: "cov_a", label: "Coverage A — Dwelling", value: "$285,000" },
  { key: "cov_b", label: "Coverage B — Other structures", value: "$28,500" },
  { key: "cov_c", label: "Coverage C — Personal property", value: "$142,500" },
  { key: "cov_d", label: "Coverage D — Loss of use", value: "$57,000" },
  { key: "liability", label: "Section II liability", value: "$300,000" },
  { key: "med_pay", label: "Medical payments", value: "$5,000" },
  { key: "ord_law", label: "Ordinance or law", value: "10%" },
  { key: "water_backup", label: "Water backup", value: "$5,000" },
];

const nairCurrentCoverages: PolicyCoverageLine[] = [
  { key: "bi", label: "Bodily injury", value: "$100,000 / $300,000" },
  { key: "pd", label: "Property damage", value: "$50,000" },
  { key: "um", label: "UM / UIM", value: "$100,000 / $300,000" },
  { key: "pip", label: "PIP", value: "$10,000" },
  { key: "rental", label: "Rental reimbursement", value: "$30 / day, $900 max" },
  { key: "towing", label: "Towing and labor", value: "$75" },
];

const nairProposedCoverages: PolicyCoverageLine[] = [
  { key: "bi", label: "Bodily injury", value: "$100,000 / $300,000" },
  { key: "pd", label: "Property damage", value: "$50,000" },
  { key: "um", label: "UM / UIM", value: "$100,000 / $300,000" },
  { key: "pip", label: "PIP", value: "$10,000" },
  { key: "rental", label: "Rental reimbursement", value: "$40 / day, $1,200 max" },
  { key: "towing", label: "Towing and labor", value: "$75" },
];

async function upsertCarrier(values: typeof carriers.$inferInsert) {
  await db
    .insert(carriers)
    .values(values)
    .onConflictDoUpdate({
      target: carriers.id,
      set: {
        name: values.name,
        writtenLines: values.writtenLines,
        dontWriteNotes: values.dontWriteNotes,
        portalStatus: values.portalStatus,
        fixtureTag: values.fixtureTag,
        active: values.active,
        updatedAt: new Date(),
      },
    });
}

async function upsertContact(values: typeof contacts.$inferInsert) {
  await db
    .insert(contacts)
    .values(values)
    .onConflictDoUpdate({
      target: contacts.id,
      set: {
        firstName: values.firstName,
        lastName: values.lastName,
        mailingAddress: values.mailingAddress,
        city: values.city,
        state: values.state,
        zip: values.zip,
        tenureStart: values.tenureStart,
        policyCount: values.policyCount,
        notes: values.notes,
        updatedAt: new Date(),
      },
    });
}

export async function seedBookRenewals() {
  await upsertCarrier({
    id: BOOK_CARRIER_IDS.heritage,
    tenantId: TENANT_ID,
    name: "Heritage Property & Casualty",
    writtenLines: ["HO"],
    dontWriteNotes: "Book carrier for the Hale renewal demo. Not an Ana Dib shop market.",
    portalStatus: "open",
    fixtureTag: "book-renewal-2026",
    active: true,
  });
  await upsertCarrier({
    id: BOOK_CARRIER_IDS.progressive,
    tenantId: TENANT_ID,
    name: "Progressive",
    writtenLines: ["AUTO"],
    dontWriteNotes: "Book carrier for the Nair Auto renewal demo. Not an Ana Dib shop market.",
    portalStatus: "open",
    fixtureTag: "book-renewal-2026",
    active: true,
  });

  await upsertContact({
    id: HALE_CONTACT_ID,
    tenantId: TENANT_ID,
    firstName: "Marcus",
    lastName: "Hale",
    mailingAddress: "412 Willow Oak Dr",
    city: "Winter Park",
    state: "FL",
    zip: "32789",
    tenureStart: new Date("2025-10-01T05:00:00.000Z"),
    policyCount: 1,
    notes: "Existing-book HO3. In-force at Heritage. Use Compare renewal — not the Ana Dib shop.",
  });
  await upsertContact({
    id: NAIR_CONTACT_ID,
    tenantId: TENANT_ID,
    firstName: "Priya",
    lastName: "Nair",
    mailingAddress: "1802 N Armenia Ave",
    city: "Tampa",
    state: "FL",
    zip: "33607",
    tenureStart: new Date("2025-11-15T05:00:00.000Z"),
    policyCount: 1,
    notes: "Existing-book personal auto. In-force at Progressive.",
  });

  await db
    .insert(deals)
    .values({
      id: HALE_DEAL_ID,
      tenantId: TENANT_ID,
      contactId: HALE_CONTACT_ID,
      title: "Hale · Winter Park HO3",
      pipelineStage: "bound",
      lineOfBusiness: "HO",
      state: "FL",
      primaryNamedInsured: "Marcus Hale",
      boundAt: new Date("2025-10-01T05:00:00.000Z"),
      notes: "Existing-book bind. Renewal compare lives on the policy, not a new shop.",
    })
    .onConflictDoUpdate({
      target: deals.id,
      set: {
        contactId: HALE_CONTACT_ID,
        title: "Hale · Winter Park HO3",
        pipelineStage: "bound",
        lineOfBusiness: "HO",
        primaryNamedInsured: "Marcus Hale",
        notes: "Existing-book bind. Renewal compare lives on the policy, not a new shop.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(deals)
    .values({
      id: NAIR_DEAL_ID,
      tenantId: TENANT_ID,
      contactId: NAIR_CONTACT_ID,
      title: "Nair · Tampa Auto",
      pipelineStage: "bound",
      lineOfBusiness: "AUTO",
      state: "FL",
      primaryNamedInsured: "Priya Nair",
      boundAt: new Date("2025-11-15T05:00:00.000Z"),
      notes: "Existing-book auto. Renewal compare lives on the policy.",
    })
    .onConflictDoUpdate({
      target: deals.id,
      set: {
        contactId: NAIR_CONTACT_ID,
        title: "Nair · Tampa Auto",
        pipelineStage: "bound",
        lineOfBusiness: "AUTO",
        primaryNamedInsured: "Priya Nair",
        notes: "Existing-book auto. Renewal compare lives on the policy.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(risks)
    .values({
      id: HALE_RISK_ID,
      tenantId: TENANT_ID,
      dealId: HALE_DEAL_ID,
      contactId: HALE_CONTACT_ID,
      riskType: "property",
      address1: "412 Willow Oak Dr",
      city: "Winter Park",
      county: "Orange",
      state: "FL",
      zip: "32789",
      yearBuilt: 2004,
      construction: "masonry",
      occupancy: "owner",
      stories: 1,
      coverageA: 275000,
      roofYear: 2018,
      roofCovering: "shingle",
      openingProtection: "none",
      pool: false,
      protectionClass: "4",
      milesToCoast: 28,
      mobileHome: false,
    })
    .onConflictDoUpdate({
      target: risks.id,
      set: {
        dealId: HALE_DEAL_ID,
        contactId: HALE_CONTACT_ID,
        address1: "412 Willow Oak Dr",
        city: "Winter Park",
        county: "Orange",
        coverageA: 275000,
        yearBuilt: 2004,
        roofYear: 2018,
        roofCovering: "shingle",
        construction: "masonry",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(risks)
    .values({
      id: NAIR_RISK_ID,
      tenantId: TENANT_ID,
      dealId: NAIR_DEAL_ID,
      contactId: NAIR_CONTACT_ID,
      riskType: "auto",
      address1: "1802 N Armenia Ave",
      city: "Tampa",
      county: "Hillsborough",
      state: "FL",
      zip: "33607",
      vin: "2HKRS4H59MH312887",
      vehicleYear: 2021,
      vehicleMake: "Honda",
      vehicleModel: "CR-V",
      vehicleUsage: "commute",
      garagingZip: "33607",
    })
    .onConflictDoUpdate({
      target: risks.id,
      set: {
        dealId: NAIR_DEAL_ID,
        contactId: NAIR_CONTACT_ID,
        vin: "2HKRS4H59MH312887",
        vehicleYear: 2021,
        vehicleMake: "Honda",
        vehicleModel: "CR-V",
        city: "Tampa",
        county: "Hillsborough",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(policies)
    .values({
      id: HALE_POLICY_ID,
      tenantId: TENANT_ID,
      contactId: HALE_CONTACT_ID,
      dealId: HALE_DEAL_ID,
      riskId: HALE_RISK_ID,
      carrierId: BOOK_CARRIER_IDS.heritage,
      policyNumber: "HP-FL-88421",
      lineOfBusiness: "HO",
      status: "active",
      effectiveDate: new Date("2025-10-01T05:00:00.000Z"),
      expirationDate: new Date("2026-10-01T05:00:00.000Z"),
      renewalDate: new Date("2026-10-01T05:00:00.000Z"),
      premium: HALE_CURRENT_PREMIUM,
      coverageA: 275000,
      formType: "HO3",
      policyType: "Home",
      policySubType: "HO3",
      billingFrequency: "annual",
      sellingAgency: "afa",
      premisesAddress: "412 Willow Oak Dr",
      premisesCity: "Winter Park",
      premisesState: "FL",
      premisesZip: "32789",
    })
    .onConflictDoUpdate({
      target: policies.id,
      set: {
        contactId: HALE_CONTACT_ID,
        carrierId: BOOK_CARRIER_IDS.heritage,
        policyNumber: "HP-FL-88421",
        status: "active",
        premium: HALE_CURRENT_PREMIUM,
        coverageA: 275000,
        formType: "HO3",
        policyType: "Home",
        policySubType: "HO3",
        billingFrequency: "annual",
        sellingAgency: "afa",
        renewalDate: new Date("2026-10-01T05:00:00.000Z"),
        premisesAddress: "412 Willow Oak Dr",
        premisesCity: "Winter Park",
        premisesState: "FL",
        premisesZip: "32789",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(policies)
    .values({
      id: NAIR_POLICY_ID,
      tenantId: TENANT_ID,
      contactId: NAIR_CONTACT_ID,
      dealId: NAIR_DEAL_ID,
      riskId: NAIR_RISK_ID,
      carrierId: BOOK_CARRIER_IDS.progressive,
      policyNumber: "PA-FL-22910",
      lineOfBusiness: "AUTO",
      status: "active",
      effectiveDate: new Date("2025-11-15T05:00:00.000Z"),
      expirationDate: new Date("2026-11-15T05:00:00.000Z"),
      premium: NAIR_CURRENT_PREMIUM,
    })
    .onConflictDoUpdate({
      target: policies.id,
      set: {
        contactId: NAIR_CONTACT_ID,
        carrierId: BOOK_CARRIER_IDS.progressive,
        policyNumber: "PA-FL-22910",
        status: "active",
        premium: NAIR_CURRENT_PREMIUM,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(policyTerms)
    .values({
      id: HALE_CURRENT_TERM_ID,
      tenantId: TENANT_ID,
      policyId: HALE_POLICY_ID,
      role: "current",
      termEffective: new Date("2025-10-01T05:00:00.000Z"),
      termExpiration: new Date("2026-10-01T05:00:00.000Z"),
      premium: HALE_CURRENT_PREMIUM,
      aopDeductible: "$2,500",
      hurricaneDeductible: "2%",
      coverages: haleCurrentCoverages,
      notes: "In-force Heritage HO3.",
      source: "seed",
    })
    .onConflictDoUpdate({
      target: policyTerms.id,
      set: {
        premium: HALE_CURRENT_PREMIUM,
        aopDeductible: "$2,500",
        hurricaneDeductible: "2%",
        coverages: haleCurrentCoverages,
        notes: "In-force Heritage HO3.",
      },
    });

  await db
    .insert(policyTerms)
    .values({
      id: HALE_PROPOSED_TERM_ID,
      tenantId: TENANT_ID,
      policyId: HALE_POLICY_ID,
      role: "proposed",
      termEffective: new Date("2026-10-01T05:00:00.000Z"),
      termExpiration: new Date("2027-10-01T05:00:00.000Z"),
      premium: HALE_PROPOSED_PREMIUM,
      aopDeductible: "$2,500",
      hurricaneDeductible: "5%",
      coverages: haleProposedCoverages,
      notes: "Heritage renewal offer received 2026-08-18. Not a FitFirst rate.",
      source: "carrier_offer",
    })
    .onConflictDoUpdate({
      target: policyTerms.id,
      set: {
        premium: HALE_PROPOSED_PREMIUM,
        aopDeductible: "$2,500",
        hurricaneDeductible: "5%",
        coverages: haleProposedCoverages,
        notes: "Heritage renewal offer received 2026-08-18. Not a FitFirst rate.",
      },
    });

  await db
    .insert(policyTerms)
    .values({
      id: NAIR_CURRENT_TERM_ID,
      tenantId: TENANT_ID,
      policyId: NAIR_POLICY_ID,
      role: "current",
      termEffective: new Date("2025-11-15T05:00:00.000Z"),
      termExpiration: new Date("2026-11-15T05:00:00.000Z"),
      premium: NAIR_CURRENT_PREMIUM,
      comprehensiveDeductible: "$500",
      collisionDeductible: "$1,000",
      coverages: nairCurrentCoverages,
      notes: "In-force Progressive personal auto.",
      source: "seed",
    })
    .onConflictDoUpdate({
      target: policyTerms.id,
      set: {
        premium: NAIR_CURRENT_PREMIUM,
        comprehensiveDeductible: "$500",
        collisionDeductible: "$1,000",
        coverages: nairCurrentCoverages,
        notes: "In-force Progressive personal auto.",
      },
    });

  await db
    .insert(policyTerms)
    .values({
      id: NAIR_PROPOSED_TERM_ID,
      tenantId: TENANT_ID,
      policyId: NAIR_POLICY_ID,
      role: "proposed",
      termEffective: new Date("2026-11-15T05:00:00.000Z"),
      termExpiration: new Date("2027-11-15T05:00:00.000Z"),
      premium: NAIR_PROPOSED_PREMIUM,
      comprehensiveDeductible: "$500",
      collisionDeductible: "$500",
      coverages: nairProposedCoverages,
      notes: "Progressive renewal offer received 2026-08-22. Not a FitFirst rate.",
      source: "carrier_offer",
    })
    .onConflictDoUpdate({
      target: policyTerms.id,
      set: {
        premium: NAIR_PROPOSED_PREMIUM,
        comprehensiveDeductible: "$500",
        collisionDeductible: "$500",
        coverages: nairProposedCoverages,
        notes: "Progressive renewal offer received 2026-08-22. Not a FitFirst rate.",
      },
    });

  const haleChange = premiumChange(Number(HALE_CURRENT_PREMIUM), Number(HALE_PROPOSED_PREMIUM));
  const nairChange = premiumChange(Number(NAIR_CURRENT_PREMIUM), Number(NAIR_PROPOSED_PREMIUM));
  const haleRows = coverageRows(haleCurrentCoverages, haleProposedCoverages);
  const nairRows = coverageRows(nairCurrentCoverages, nairProposedCoverages);
  const haleSummary = compareSummary(haleChange);
  const nairSummary = compareSummary(nairChange);

  await db
    .insert(renewalCompareLogs)
    .values({
      id: HALE_COMPARE_LOG_ID,
      tenantId: TENANT_ID,
      policyId: HALE_POLICY_ID,
      currentTermId: HALE_CURRENT_TERM_ID,
      proposedTermId: HALE_PROPOSED_TERM_ID,
      eventType: "seeded",
      currentPremium: HALE_CURRENT_PREMIUM,
      proposedPremium: HALE_PROPOSED_PREMIUM,
      delta: haleChange.delta.toFixed(2),
      pct: haleChange.pct?.toFixed(4) ?? null,
      summary: haleSummary,
      snapshot: buildCompareSnapshot({
        currentPremium: HALE_CURRENT_PREMIUM,
        proposedPremium: HALE_PROPOSED_PREMIUM,
        change: haleChange,
        currentDeductibles: { aopDeductible: "$2,500", hurricaneDeductible: "2%" },
        proposedDeductibles: { aopDeductible: "$2,500", hurricaneDeductible: "5%" },
        coverageRows: haleRows,
      }),
    })
    .onConflictDoUpdate({
      target: renewalCompareLogs.id,
      set: {
        summary: haleSummary,
        currentPremium: HALE_CURRENT_PREMIUM,
        proposedPremium: HALE_PROPOSED_PREMIUM,
        delta: haleChange.delta.toFixed(2),
        pct: haleChange.pct?.toFixed(4) ?? null,
      },
    });

  await db
    .insert(renewalCompareLogs)
    .values({
      id: NAIR_COMPARE_LOG_ID,
      tenantId: TENANT_ID,
      policyId: NAIR_POLICY_ID,
      currentTermId: NAIR_CURRENT_TERM_ID,
      proposedTermId: NAIR_PROPOSED_TERM_ID,
      eventType: "seeded",
      currentPremium: NAIR_CURRENT_PREMIUM,
      proposedPremium: NAIR_PROPOSED_PREMIUM,
      delta: nairChange.delta.toFixed(2),
      pct: nairChange.pct?.toFixed(4) ?? null,
      summary: nairSummary,
      snapshot: buildCompareSnapshot({
        currentPremium: NAIR_CURRENT_PREMIUM,
        proposedPremium: NAIR_PROPOSED_PREMIUM,
        change: nairChange,
        currentDeductibles: {
          comprehensiveDeductible: "$500",
          collisionDeductible: "$1,000",
        },
        proposedDeductibles: {
          comprehensiveDeductible: "$500",
          collisionDeductible: "$500",
        },
        coverageRows: nairRows,
      }),
    })
    .onConflictDoUpdate({
      target: renewalCompareLogs.id,
      set: {
        summary: nairSummary,
        currentPremium: NAIR_CURRENT_PREMIUM,
        proposedPremium: NAIR_PROPOSED_PREMIUM,
        delta: nairChange.delta.toFixed(2),
        pct: nairChange.pct?.toFixed(4) ?? null,
      },
    });

  await db
    .delete(clientHistory)
    .where(
      and(
        eq(clientHistory.tenantId, TENANT_ID),
        inArray(clientHistory.policyId, [HALE_POLICY_ID, NAIR_POLICY_ID]),
        eq(clientHistory.eventType, "renewal_offer"),
      ),
    );
  await db.insert(clientHistory).values([
    {
      tenantId: TENANT_ID,
      contactId: HALE_CONTACT_ID,
      dealId: HALE_DEAL_ID,
      policyId: HALE_POLICY_ID,
      eventType: "renewal_offer",
      body: `Heritage renewal offer on HP-FL-88421. ${haleSummary}`,
      occurredAt: new Date("2026-08-18T15:00:00.000Z"),
    },
    {
      tenantId: TENANT_ID,
      contactId: NAIR_CONTACT_ID,
      dealId: NAIR_DEAL_ID,
      policyId: NAIR_POLICY_ID,
      eventType: "renewal_offer",
      body: `Progressive renewal offer on PA-FL-22910. ${nairSummary}`,
      occurredAt: new Date("2026-08-22T15:00:00.000Z"),
    },
  ]);

  await db
    .delete(reviewTasks)
    .where(
      and(
        eq(reviewTasks.tenantId, TENANT_ID),
        inArray(reviewTasks.policyId, [HALE_POLICY_ID, NAIR_POLICY_ID]),
      ),
    );
  await db.insert(reviewTasks).values([
    {
      tenantId: TENANT_ID,
      contactId: HALE_CONTACT_ID,
      policyId: HALE_POLICY_ID,
      dealId: HALE_DEAL_ID,
      kind: "expiration",
      title: "Renewal compare · Hale HP-FL-88421",
      dueDate: new Date("2026-09-01T15:00:00.000Z"),
      status: "open",
    },
    {
      tenantId: TENANT_ID,
      contactId: NAIR_CONTACT_ID,
      policyId: NAIR_POLICY_ID,
      dealId: NAIR_DEAL_ID,
      kind: "expiration",
      title: "Renewal compare · Nair PA-FL-22910",
      dueDate: new Date("2026-10-16T15:00:00.000Z"),
      status: "open",
    },
  ]);

  await db.insert(alerts).values([
    {
      tenantId: TENANT_ID,
      kind: "renewal_compare",
      title: "Hale HO3 renewal · +$363 / +16.6%",
      body: "Heritage HP-FL-88421. Current $2,184 vs proposed $2,547. Hurricane deductible 2% → 5%. Open Compare renewal on the in-force policy — this is not a rater.",
      severity: "warning",
      entityType: "policy",
      entityId: HALE_POLICY_ID,
    },
    {
      tenantId: TENANT_ID,
      kind: "renewal_compare",
      title: "Nair Auto renewal · -$72 / -5.0%",
      body: "Progressive PA-FL-22910. Current $1,428 vs proposed $1,356. Collision deductible $1,000 → $500.",
      severity: "info",
      entityType: "policy",
      entityId: NAIR_POLICY_ID,
    },
  ]);
}
