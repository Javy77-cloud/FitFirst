import { eq } from "drizzle-orm";
import {
  APPOINTMENT_LINES,
  type SellingAgency,
} from "@/lib/domain";
import type { QuoteSheetFieldValue } from "./schema";
import { db } from "./index";
import {
  carrierAppointments,
  contacts,
  deals,
  leads,
  quoteSheets,
  risks,
} from "./schema";
import fixture from "../fixtures/ana-dib-ho3-2026-09-02.json";
import { ORTEGA_FIT } from "../fixtures/ortega-ho3";
import {
  ANA_HOME_SHEET_ID,
  CARRIER_IDS,
  DEAL_ID,
  FIT_CONTACT_ID,
  FIT_DEAL_ID,
  FIT_HOME_SHEET_ID,
  FIT_LEAD_ID,
  FIT_RISK_ID,
  TENANT_ID,
} from "../fixtures/ids";

type CarrierKey = keyof typeof CARRIER_IDS;

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

function confirmed(value: string, source: QuoteSheetFieldValue["source"] = "seed"): QuoteSheetFieldValue {
  return { value, status: "confirmed", source };
}

function homeSheet(values: Record<string, string>, coverageASource: QuoteSheetFieldValue["source"] = "seed") {
  const sheet: Record<string, QuoteSheetFieldValue> = {};
  for (const [key, value] of Object.entries(values)) {
    sheet[key] = key === "coverage_a" ? confirmed(value, coverageASource) : confirmed(value);
  }
  return sheet;
}

export async function seedAppointmentsAndSheets() {
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

  await db
    .insert(quoteSheets)
    .values({
      id: ANA_HOME_SHEET_ID,
      tenantId: TENANT_ID,
      dealId: DEAL_ID,
      line: "home",
      values: homeSheet(
        {
          address1: fixture.risk.address1,
          city: fixture.risk.city,
          county: fixture.risk.county,
          state: fixture.risk.state,
          zip: fixture.risk.zip,
          year_built: String(fixture.risk.yearBuilt),
          stories: String(fixture.risk.stories),
          construction: fixture.risk.construction,
          occupancy: fixture.risk.occupancy,
          roof_year: String(fixture.risk.roofYear),
          roof_covering: fixture.risk.roofCovering,
          opening_protection: fixture.risk.openingProtection,
          pool: fixture.risk.pool ? "true" : "false",
          mobile_home: "false",
          protection_class: fixture.risk.protectionClass,
          miles_to_coast: String(fixture.risk.milesToCoast),
          coverage_a: String(fixture.risk.coverageA),
          notes: `${fixture.risk.occupancyNote}. ${fixture.risk.constructionNote}. ${fixture.risk.coverageANote}`,
        },
        "javy",
      ),
    })
    .onConflictDoUpdate({
      target: quoteSheets.id,
      set: {
        dealId: DEAL_ID,
        line: "home",
        values: homeSheet(
          {
            address1: fixture.risk.address1,
            city: fixture.risk.city,
            county: fixture.risk.county,
            state: fixture.risk.state,
            zip: fixture.risk.zip,
            year_built: String(fixture.risk.yearBuilt),
            stories: String(fixture.risk.stories),
            construction: fixture.risk.construction,
            occupancy: fixture.risk.occupancy,
            roof_year: String(fixture.risk.roofYear),
            roof_covering: fixture.risk.roofCovering,
            opening_protection: fixture.risk.openingProtection,
            pool: fixture.risk.pool ? "true" : "false",
            mobile_home: "false",
            protection_class: fixture.risk.protectionClass,
            miles_to_coast: String(fixture.risk.milesToCoast),
            coverage_a: String(fixture.risk.coverageA),
            notes: `${fixture.risk.occupancyNote}. ${fixture.risk.constructionNote}. ${fixture.risk.coverageANote}`,
          },
          "javy",
        ),
        updatedAt: new Date(),
      },
    });
}

export async function seedOrtegaFitDeal() {
  await db
    .insert(leads)
    .values({
      id: FIT_LEAD_ID,
      tenantId: TENANT_ID,
      firstName: ORTEGA_FIT.firstName,
      lastName: ORTEGA_FIT.lastName,
      source: "book",
      status: "converted",
      notes:
        "Inland Orange masonry HO3 that clears appointed first-wave Home appetite. Demo only — no quotes invented.",
      convertedDealId: FIT_DEAL_ID,
    })
    .onConflictDoUpdate({
      target: leads.id,
      set: {
        firstName: ORTEGA_FIT.firstName,
        lastName: ORTEGA_FIT.lastName,
        status: "converted",
        convertedDealId: FIT_DEAL_ID,
        notes:
          "Inland Orange masonry HO3 that clears appointed first-wave Home appetite. Demo only — no quotes invented.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(contacts)
    .values({
      id: FIT_CONTACT_ID,
      tenantId: TENANT_ID,
      firstName: ORTEGA_FIT.firstName,
      lastName: ORTEGA_FIT.lastName,
      mailingAddress: ORTEGA_FIT.address1,
      city: ORTEGA_FIT.city,
      state: ORTEGA_FIT.state,
      zip: ORTEGA_FIT.zip,
      policyCount: 0,
      notes: "Shopping contact for the Winter Garden fit demo. No policy from this shop.",
    })
    .onConflictDoUpdate({
      target: contacts.id,
      set: {
        firstName: ORTEGA_FIT.firstName,
        lastName: ORTEGA_FIT.lastName,
        mailingAddress: ORTEGA_FIT.address1,
        city: ORTEGA_FIT.city,
        state: ORTEGA_FIT.state,
        zip: ORTEGA_FIT.zip,
        policyCount: 0,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(deals)
    .values({
      id: FIT_DEAL_ID,
      tenantId: TENANT_ID,
      leadId: FIT_LEAD_ID,
      contactId: FIT_CONTACT_ID,
      title: ORTEGA_FIT.title,
      pipelineStage: "shopping",
      lineOfBusiness: "HO",
      state: "FL",
      primaryNamedInsured: `${ORTEGA_FIT.firstName} ${ORTEGA_FIT.lastName}`,
      notes:
        "Filled Home sheet. Markets should shop appointed first-wave fits without naming carriers. No quotes seeded.",
    })
    .onConflictDoUpdate({
      target: deals.id,
      set: {
        leadId: FIT_LEAD_ID,
        contactId: FIT_CONTACT_ID,
        title: ORTEGA_FIT.title,
        pipelineStage: "shopping",
        lineOfBusiness: "HO",
        primaryNamedInsured: `${ORTEGA_FIT.firstName} ${ORTEGA_FIT.lastName}`,
        notes:
          "Filled Home sheet. Markets should shop appointed first-wave fits without naming carriers. No quotes seeded.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(risks)
    .values({
      id: FIT_RISK_ID,
      tenantId: TENANT_ID,
      dealId: FIT_DEAL_ID,
      contactId: FIT_CONTACT_ID,
      riskType: "property",
      address1: ORTEGA_FIT.address1,
      city: ORTEGA_FIT.city,
      county: ORTEGA_FIT.county,
      state: ORTEGA_FIT.state,
      zip: ORTEGA_FIT.zip,
      yearBuilt: ORTEGA_FIT.yearBuilt,
      construction: ORTEGA_FIT.construction,
      occupancy: ORTEGA_FIT.occupancy,
      stories: ORTEGA_FIT.stories,
      coverageA: ORTEGA_FIT.coverageA,
      roofYear: ORTEGA_FIT.roofYear,
      roofCovering: ORTEGA_FIT.roofCovering,
      openingProtection: ORTEGA_FIT.openingProtection,
      pool: ORTEGA_FIT.pool,
      protectionClass: ORTEGA_FIT.protectionClass,
      milesToCoast: ORTEGA_FIT.milesToCoast,
      mobileHome: false,
    })
    .onConflictDoUpdate({
      target: risks.id,
      set: {
        dealId: FIT_DEAL_ID,
        address1: ORTEGA_FIT.address1,
        city: ORTEGA_FIT.city,
        county: ORTEGA_FIT.county,
        state: ORTEGA_FIT.state,
        zip: ORTEGA_FIT.zip,
        yearBuilt: ORTEGA_FIT.yearBuilt,
        construction: ORTEGA_FIT.construction,
        occupancy: ORTEGA_FIT.occupancy,
        stories: ORTEGA_FIT.stories,
        coverageA: ORTEGA_FIT.coverageA,
        roofYear: ORTEGA_FIT.roofYear,
        roofCovering: ORTEGA_FIT.roofCovering,
        openingProtection: ORTEGA_FIT.openingProtection,
        pool: ORTEGA_FIT.pool,
        protectionClass: ORTEGA_FIT.protectionClass,
        milesToCoast: ORTEGA_FIT.milesToCoast,
        mobileHome: false,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(quoteSheets)
    .values({
      id: FIT_HOME_SHEET_ID,
      tenantId: TENANT_ID,
      dealId: FIT_DEAL_ID,
      line: "home",
      values: homeSheet({
        address1: ORTEGA_FIT.address1,
        city: ORTEGA_FIT.city,
        county: ORTEGA_FIT.county,
        state: ORTEGA_FIT.state,
        zip: ORTEGA_FIT.zip,
        year_built: String(ORTEGA_FIT.yearBuilt),
        stories: String(ORTEGA_FIT.stories),
        construction: ORTEGA_FIT.construction,
        occupancy: ORTEGA_FIT.occupancy,
        roof_year: String(ORTEGA_FIT.roofYear),
        roof_covering: ORTEGA_FIT.roofCovering,
        opening_protection: ORTEGA_FIT.openingProtection,
        pool: "false",
        mobile_home: "false",
        protection_class: ORTEGA_FIT.protectionClass,
        miles_to_coast: String(ORTEGA_FIT.milesToCoast),
        coverage_a: String(ORTEGA_FIT.coverageA),
        notes: "Inland masonry, 2022 shingle. Shop appointed first-wave Home fits. No quotes invented.",
      }),
    })
    .onConflictDoUpdate({
      target: quoteSheets.id,
      set: {
        dealId: FIT_DEAL_ID,
        line: "home",
        values: homeSheet({
          address1: ORTEGA_FIT.address1,
          city: ORTEGA_FIT.city,
          county: ORTEGA_FIT.county,
          state: ORTEGA_FIT.state,
          zip: ORTEGA_FIT.zip,
          year_built: String(ORTEGA_FIT.yearBuilt),
          stories: String(ORTEGA_FIT.stories),
          construction: ORTEGA_FIT.construction,
          occupancy: ORTEGA_FIT.occupancy,
          roof_year: String(ORTEGA_FIT.roofYear),
          roof_covering: ORTEGA_FIT.roofCovering,
          opening_protection: ORTEGA_FIT.openingProtection,
          pool: "false",
          mobile_home: "false",
          protection_class: ORTEGA_FIT.protectionClass,
          miles_to_coast: String(ORTEGA_FIT.milesToCoast),
          coverage_a: String(ORTEGA_FIT.coverageA),
          notes: "Inland masonry, 2022 shingle. Shop appointed first-wave Home fits. No quotes invented.",
        }),
        updatedAt: new Date(),
      },
    });
}
