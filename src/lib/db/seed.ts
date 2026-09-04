import { and, eq } from "drizzle-orm";
import { db } from "./index";
import {
  APPOINTMENT_LINES,
  type SellingAgency,
} from "@/lib/domain";
import {
  alerts,
  appetiteRules,
  carrierAppointments,
  carriers,
  contacts,
  deals,
  leads,
  quoteAttemptLogs,
  quoteSheets,
  quotes,
  reviewTasks,
  risks,
  tenants,
} from "./schema";
import { CARRIER_DESK } from "@/lib/carriers/desk";
import fixture from "../fixtures/ana-dib-ho3-2026-09-02.json";
import {
  ANA_HOME_SHEET_ID,
  CARRIER_IDS,
  CONTACT_ID,
  DEAL_ID,
  LEAD_ID,
  RISK_ID,
  TENANT_ID,
} from "../fixtures/ids";
import { anaHomeSheetValues, anaPropertyOneliner } from "@/lib/quote-sheet/ana-home";
import { seedLifecycleDemo } from "./seed-lifecycle";
import { seedWireDesk } from "./seed-wire";
import { seedOwnerBook } from "./seed-owner-book";
import { seedWave1ZohoBook } from "./seed-wave1";
import { seedMergeDuplicates } from "./seed-merge";
import { seedAppointmentsAndSheets, seedOrtegaFitDeal } from "./seed-shop-fits";
import { seedCompleteness } from "./seed-completeness";
import { seedUsersAndBook } from "./seed-book";
import { seedClaimsBook } from "./seed-claims";
import { seedAutoBook } from "./seed-auto";
import { seedBookRenewals } from "./seed-book-renewals";
import { seedCommsDesk } from "./seed-comms";
import { ensureDefaultLineSubfilters } from "./line-settings";
import { seedCalendarDesk } from "./seed-calendar";
import { seedGlobalLists } from "./seed-global-lists";
import { seedMfaDemo } from "./seed-mfa";

type CarrierKey = keyof typeof CARRIER_IDS;

/** Selling paper for first-wave Home. Other lines reuse the same agency, appointed=false. */
const HOME_SELLING_AGENCY: Record<CarrierKey, SellingAgency> = {
  tailrow: "First Connect",
  hoc: "AFA",
  vyrd: "AFA",
  qbe: "AFA",
  vave: "Agentero",
  benchmark: "AFA",
  hadron: "First Connect",
  geovera: "AFA",
  sagesure: "First Connect",
  americanIntegrity: "AFA",
};

const SHOP_AT = new Date(`${fixture.shopDate}T16:00:00.000Z`);

export async function seedIfEmpty() {
  await seed();
  return { seeded: true };
}

export async function seed() {
  await db
    .insert(tenants)
    .values({
      id: TENANT_ID,
      tenantId: TENANT_ID,
      name: fixture.tenant.name,
    })
    .onConflictDoUpdate({
      target: tenants.id,
      set: { name: fixture.tenant.name, tenantId: TENANT_ID },
    });

  await db
    .insert(leads)
    .values({
      id: LEAD_ID,
      tenantId: TENANT_ID,
      firstName: "Ana",
      lastName: "Dib",
      phone: "(321) 555-0144",
      email: "ana.dib@desk.local",
      source: "book",
      status: "converted",
      notes: `HO3 shop ${fixture.shopDate}. ${fixture.risk.coverageANote} ${fixture.insured.namedInsuredNote}`,
      convertedDealId: DEAL_ID,
    })
    .onConflictDoUpdate({
      target: leads.id,
      set: {
        firstName: "Ana",
        lastName: "Dib",
        phone: "(321) 555-0144",
        email: "ana.dib@desk.local",
        status: "converted",
        convertedDealId: DEAL_ID,
        notes: `HO3 shop ${fixture.shopDate}. ${fixture.risk.coverageANote} ${fixture.insured.namedInsuredNote}`,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(contacts)
    .values({
      id: CONTACT_ID,
      tenantId: TENANT_ID,
      firstName: "Ana",
      lastName: "Dib",
      phone: "(321) 555-0144",
      email: "ana.dib@desk.local",
      mailingAddress: fixture.risk.address1,
      city: fixture.risk.city,
      state: fixture.risk.state,
      zip: fixture.risk.zip,
      policyCount: 0,
      activePolicyCount: 0,
      notes: `Primary named insured. Secondary: ${fixture.insured.namedInsured}. ${fixture.insured.namedInsuredNote} Contact exists for the shop; no policy was created from these quotes.`,
    })
    .onConflictDoUpdate({
      target: contacts.id,
      set: {
        firstName: "Ana",
        lastName: "Dib",
        phone: "(321) 555-0144",
        email: "ana.dib@desk.local",
        mailingAddress: fixture.risk.address1,
        city: fixture.risk.city,
        state: fixture.risk.state,
        zip: fixture.risk.zip,
        policyCount: 0,
        activePolicyCount: 0,
        notes: `Primary named insured. Secondary: ${fixture.insured.namedInsured}. ${fixture.insured.namedInsuredNote} Contact exists for the shop; no policy was created from these quotes.`,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(deals)
    .values({
      id: DEAL_ID,
      tenantId: TENANT_ID,
      leadId: LEAD_ID,
      contactId: CONTACT_ID,
      title: "Dib · Palm Bay HO3",
      pipelineStage: "shopping",
      lineOfBusiness: "HO",
      state: "FL",
      primaryNamedInsured: fixture.insured.primary,
      secondaryNamedInsured: fixture.insured.namedInsured,
      shopLines: ["home"],
      coverageAmount: fixture.risk.coverageA,
      propertyOneliner: anaPropertyOneliner(fixture.risk),
      currentCarrier: null,
      accountKind: "personal",
      notes: `${fixture.shopDate} shop: ${fixture.outcome.marketsRun} markets, ${fixture.outcome.bindableAt321k} bindable at $${fixture.risk.coverageA.toLocaleString("en-US")}. ${fixture.risk.occupancyNote}. Construction ${fixture.risk.constructionNote}. ${fixture.risk.roofCoveringNote}. ${fixture.risk.coverageANote} No policy from these quotes.`,
    })
    .onConflictDoUpdate({
      target: deals.id,
      set: {
        leadId: LEAD_ID,
        contactId: CONTACT_ID,
        title: "Dib · Palm Bay HO3",
        pipelineStage: "shopping",
        lineOfBusiness: "HO",
        primaryNamedInsured: fixture.insured.primary,
        secondaryNamedInsured: fixture.insured.namedInsured,
        shopLines: ["home"],
        coverageAmount: fixture.risk.coverageA,
        propertyOneliner: anaPropertyOneliner(fixture.risk),
        currentCarrier: null,
        accountKind: "personal",
        notes: `${fixture.shopDate} shop: ${fixture.outcome.marketsRun} markets, ${fixture.outcome.bindableAt321k} bindable at $${fixture.risk.coverageA.toLocaleString("en-US")}. ${fixture.risk.occupancyNote}. Construction ${fixture.risk.constructionNote}. ${fixture.risk.roofCoveringNote}. ${fixture.risk.coverageANote} No policy from these quotes.`,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(risks)
    .values({
      id: RISK_ID,
      tenantId: TENANT_ID,
      dealId: DEAL_ID,
      contactId: CONTACT_ID,
      riskType: "property",
      address1: fixture.risk.address1,
      city: fixture.risk.city,
      county: fixture.risk.county,
      state: fixture.risk.state,
      zip: fixture.risk.zip,
      yearBuilt: fixture.risk.yearBuilt,
      construction: fixture.risk.construction,
      occupancy: fixture.risk.occupancy,
      stories: fixture.risk.stories,
      coverageA: fixture.risk.coverageA,
      roofYear: fixture.risk.roofYear,
      roofCovering: fixture.risk.roofCovering,
      openingProtection: fixture.risk.openingProtection,
      pool: fixture.risk.pool,
      protectionClass: fixture.risk.protectionClass,
      milesToCoast: fixture.risk.milesToCoast,
      mobileHome: false,
    })
    .onConflictDoUpdate({
      target: risks.id,
      set: {
        dealId: DEAL_ID,
        contactId: CONTACT_ID,
        address1: fixture.risk.address1,
        city: fixture.risk.city,
        county: fixture.risk.county,
        state: fixture.risk.state,
        zip: fixture.risk.zip,
        yearBuilt: fixture.risk.yearBuilt,
        construction: fixture.risk.construction,
        occupancy: fixture.risk.occupancy,
        stories: fixture.risk.stories,
        coverageA: fixture.risk.coverageA,
        roofYear: fixture.risk.roofYear,
        roofCovering: fixture.risk.roofCovering,
        openingProtection: fixture.risk.openingProtection,
        pool: fixture.risk.pool,
        protectionClass: fixture.risk.protectionClass,
        milesToCoast: fixture.risk.milesToCoast,
        mobileHome: false,
        squareFeet: null,
        replacementCostEstimate: null,
        updatedAt: new Date(),
      },
    });

  const anaHomeValues = anaHomeSheetValues(fixture.risk);
  await db
    .insert(quoteSheets)
    .values({
      id: ANA_HOME_SHEET_ID,
      tenantId: TENANT_ID,
      dealId: DEAL_ID,
      line: "home",
      values: anaHomeValues,
    })
    .onConflictDoUpdate({
      target: quoteSheets.id,
      set: {
        dealId: DEAL_ID,
        line: "home",
        values: anaHomeValues,
        updatedAt: new Date(),
      },
    });

  for (const carrier of fixture.carriers) {
    const key = carrier.key as CarrierKey;
    const id = CARRIER_IDS[key];
    const desk = CARRIER_DESK[key];
    await db
      .insert(carriers)
      .values({
        id,
        tenantId: TENANT_ID,
        name: carrier.name,
        writtenLines: carrier.writtenLines,
        dontWriteNotes: carrier.dontWriteNotes,
        portalStatus: carrier.portalStatus,
        portalLogin: desk.portalLogin,
        customerServicePhone: desk.customerServicePhone,
        agentPhone: desk.agentPhone,
        website: desk.website,
        agentPortalUrl: desk.agentPortalUrl,
        carrierInfo: desk.carrierInfo,
        naic: desk.naic ?? null,
        amBestRating: desk.amBestRating ?? null,
        underwriterName: desk.underwriterName ?? null,
        underwriterEmail: desk.underwriterEmail ?? null,
        underwriterPhone: desk.underwriterPhone ?? null,
        accountManagerName: desk.accountManagerName ?? null,
        accountManagerEmail: desk.accountManagerEmail ?? null,
        accountManagerPhone: desk.accountManagerPhone ?? null,
        claimsPhone: desk.claimsPhone ?? null,
        billingPhone: desk.billingPhone ?? null,
        newBusinessCommPct: desk.newBusinessCommPct ?? null,
        renewalCommPct: desk.renewalCommPct ?? null,
        territory: desk.territory ?? null,
        preferredSubmission: desk.preferredSubmission ?? null,
        bindingAuthority: desk.bindingAuthority ?? null,
        appetiteNotes: desk.appetiteNotes ?? null,
        fixtureTag: "fl-ho3-2026-09-02",
        active: true,
      })
      .onConflictDoUpdate({
        target: carriers.id,
        set: {
          name: carrier.name,
          writtenLines: carrier.writtenLines,
          dontWriteNotes: carrier.dontWriteNotes,
          portalStatus: carrier.portalStatus,
          portalLogin: desk.portalLogin,
          customerServicePhone: desk.customerServicePhone,
          agentPhone: desk.agentPhone,
          website: desk.website,
          agentPortalUrl: desk.agentPortalUrl,
          carrierInfo: desk.carrierInfo,
          naic: desk.naic ?? null,
          amBestRating: desk.amBestRating ?? null,
          underwriterName: desk.underwriterName ?? null,
          underwriterEmail: desk.underwriterEmail ?? null,
          underwriterPhone: desk.underwriterPhone ?? null,
          accountManagerName: desk.accountManagerName ?? null,
          accountManagerEmail: desk.accountManagerEmail ?? null,
          accountManagerPhone: desk.accountManagerPhone ?? null,
          claimsPhone: desk.claimsPhone ?? null,
          billingPhone: desk.billingPhone ?? null,
          newBusinessCommPct: desk.newBusinessCommPct ?? null,
          renewalCommPct: desk.renewalCommPct ?? null,
          territory: desk.territory ?? null,
          preferredSubmission: desk.preferredSubmission ?? null,
          bindingAuthority: desk.bindingAuthority ?? null,
          appetiteNotes: desk.appetiteNotes ?? null,
          fixtureTag: "fl-ho3-2026-09-02",
          active: true,
          updatedAt: new Date(),
        },
      });
  }

  await db.delete(carrierAppointments).where(eq(carrierAppointments.tenantId, TENANT_ID));
  await db.insert(carrierAppointments).values(
    (Object.keys(CARRIER_IDS) as CarrierKey[]).flatMap((key) => {
      const agency = HOME_SELLING_AGENCY[key];
      return APPOINTMENT_LINES.map((writtenLine) => ({
        tenantId: TENANT_ID,
        carrierId: CARRIER_IDS[key],
        writtenLine,
        appointed: writtenLine === "HO",
        sellingAgency: agency,
        notes:
          writtenLine === "HO"
            ? "First-wave Home appointment. Seeded appointed=true for existing shop carriers."
            : "Explicit not-appointed. Do not treat a missing row as paper.",
      }));
    }),
  );

  await db.delete(appetiteRules).where(eq(appetiteRules.tenantId, TENANT_ID));
  await db.insert(appetiteRules).values(
    fixture.carriers.map((carrier) => ({
      tenantId: TENANT_ID,
      carrierId: CARRIER_IDS[carrier.key as CarrierKey],
      lineOfBusiness: carrier.rule.lineOfBusiness,
      minCovA: "minCovA" in carrier.rule ? (carrier.rule.minCovA as number) : null,
      maxCovA: null,
      minYearBuilt: null,
      maxRoofAge: "maxRoofAge" in carrier.rule ? (carrier.rule.maxRoofAge as number) : null,
      allowedRoofCoverings:
        "allowedRoofCoverings" in carrier.rule
          ? (carrier.rule.allowedRoofCoverings as string[])
          : null,
      coastalAllowed: true,
      minMilesToCoast:
        "minMilesToCoast" in carrier.rule ? (carrier.rule.minMilesToCoast as number) : null,
      maxMilesToCoast: null,
      mobileAllowed: false,
      requiresOpeningProtection: false,
      allowedConstruction:
        "allowedConstruction" in carrier.rule
          ? (carrier.rule.allowedConstruction as string[])
          : null,
      countyMinCovA:
        "countyMinCovA" in carrier.rule
          ? (carrier.rule.countyMinCovA as Record<string, number>)
          : null,
      requireReplacementCost: false,
      rceFloorRatio: null,
      notes: carrier.rule.notes,
    })),
  );

  const snap = {
    snapYearBuilt: fixture.risk.yearBuilt,
    snapRoofYear: fixture.risk.roofYear,
    snapRoofCovering: fixture.risk.roofCovering,
    snapConstruction: fixture.risk.construction,
    snapOpeningProtection: fixture.risk.openingProtection,
    snapOccupancy: fixture.risk.occupancy,
    snapStories: fixture.risk.stories,
    snapPool: fixture.risk.pool,
    snapProtectionClass: fixture.risk.protectionClass,
    snapMilesToCoast: fixture.risk.milesToCoast,
    snapCity: fixture.risk.city,
    snapCounty: fixture.risk.county,
    snapCoverageA: fixture.risk.coverageA,
  };

  await db.delete(quotes).where(eq(quotes.dealId, DEAL_ID));
  await db.delete(quoteAttemptLogs).where(eq(quoteAttemptLogs.dealId, DEAL_ID));
  await db.insert(quoteAttemptLogs).values(
    fixture.attempts.map((attempt) => ({
      tenantId: TENANT_ID,
      dealId: DEAL_ID,
      riskId: RISK_ID,
      carrierId: CARRIER_IDS[attempt.carrierKey as CarrierKey],
      attemptedAt: SHOP_AT,
      lineOfBusiness: attempt.lineOfBusiness,
      result: attempt.result,
      bindable: attempt.bindable,
      quoteNumber: attempt.quoteNumber,
      premium: attempt.premium == null ? null : String(attempt.premium),
      covATried: attempt.covATried,
      covAForced: attempt.covAForced,
      why: attempt.why,
      ...snap,
    })),
  );

  await db.delete(alerts).where(eq(alerts.tenantId, TENANT_ID));
  await db.insert(alerts).values([
    {
      tenantId: TENANT_ID,
      kind: "appetite_warning",
      title: "Ana Dib HO3 · 8 markets, 0 bindable at $321,000",
      body: "2026-09-02 Palm Bay shop. Filter-first skips QBE (frame within 20 mi of coast), Benchmark/Hadron (37yr clay), HOC (no NB), VYRD (takeout + Brevard $350k), and the house RCE/MSB floors (Tailrow, VAVE, GeoVera, SageSure). American Integrity quoted $321k but is not bindable (roof age + RCS). Floors are attempts, not wins. No policy from these quotes.",
      severity: "warning",
      entityType: "deal",
      entityId: DEAL_ID,
    },
    {
      tenantId: TENANT_ID,
      kind: "extraction_flag",
      title: "Wind mit handwriting needs a 30-second glance",
      body: "Use the sample handwritten wind mit on the Dib deal. Fields under 80% confidence stay off the master record until you accept them.",
      severity: "info",
      entityType: "deal",
      entityId: DEAL_ID,
    },
  ]);

  await db
    .delete(reviewTasks)
    .where(and(eq(reviewTasks.tenantId, TENANT_ID), eq(reviewTasks.dealId, DEAL_ID)));
  await db.insert(reviewTasks).values({
    tenantId: TENANT_ID,
    contactId: CONTACT_ID,
    dealId: DEAL_ID,
    kind: "30_day",
    title: "30-day shop follow-up · Dib Palm Bay HO3",
    dueDate: new Date("2026-10-02T16:00:00.000Z"),
    status: "open",
  });

  await seedLifecycleDemo();
  await seedWireDesk();
  await seedOwnerBook();
  await seedAppointmentsAndSheets();
  await seedOrtegaFitDeal();
  await seedCompleteness();
  await seedMergeDuplicates();
  await seedWave1ZohoBook();
  await seedUsersAndBook();
  await seedClaimsBook();
  await seedAutoBook();
  await seedBookRenewals();
  await seedCommsDesk();
  await ensureDefaultLineSubfilters();
  await seedCalendarDesk();
  await seedGlobalLists();
  await seedMfaDemo();
}
