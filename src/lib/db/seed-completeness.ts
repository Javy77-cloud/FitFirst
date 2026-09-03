import { eq } from "drizzle-orm";
import { ruizHomeSheetValues } from "@/lib/completeness/ruiz-home";
import {
  HEALTH_DEAL_ID,
  HEALTH_LEAD_ID,
  HEALTH_RISK_ID,
  HEALTH_SHEET_ID,
  OPP_CONTACT_IDS,
  OPP_POLICY_IDS,
  TENANT_ID,
} from "@/lib/fixtures/ids";
import { db } from "./index";
import { contacts, deals, leads, policies, quoteSheets, risks } from "./schema";

const BOUND_AT = new Date("2025-09-01T16:00:00.000Z");

/**
 * Additive bound contrast for the completeness strip.
 * Uses Camila Ruiz from the opportunities book. Does not touch Ana Dib.
 */
export async function seedCompleteness() {
  await db
    .insert(leads)
    .values({
      id: HEALTH_LEAD_ID,
      tenantId: TENANT_ID,
      firstName: "Camila",
      lastName: "Ruiz",
      email: "camila.ruiz@example.com",
      phone: "321-555-0266",
      source: "book",
      status: "converted",
      notes: "Bound Melbourne HO3 used for sheet-health contrast. Not Ana.",
      convertedDealId: HEALTH_DEAL_ID,
    })
    .onConflictDoUpdate({
      target: leads.id,
      set: {
        firstName: "Camila",
        lastName: "Ruiz",
        status: "converted",
        convertedDealId: HEALTH_DEAL_ID,
        notes: "Bound Melbourne HO3 used for sheet-health contrast. Not Ana.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(deals)
    .values({
      id: HEALTH_DEAL_ID,
      tenantId: TENANT_ID,
      leadId: HEALTH_LEAD_ID,
      contactId: OPP_CONTACT_IDS.ruiz,
      title: "Camila Ruiz · Melbourne HO3 (bound)",
      pipelineStage: "bound",
      lineOfBusiness: "HO",
      state: "FL",
      primaryNamedInsured: "Camila Ruiz",
      shopLines: ["home"],
      coverageAmount: 402000,
      propertyOneliner: "880 Croton Rd, Melbourne, FL 32935 · 2004 masonry",
      currentCarrier: "American Integrity",
      boundAt: BOUND_AT,
      notes: "Closed won. Policy AI-HO-66102. Quote Sheet is fuller than Ana's open shop.",
    })
    .onConflictDoUpdate({
      target: deals.id,
      set: {
        leadId: HEALTH_LEAD_ID,
        contactId: OPP_CONTACT_IDS.ruiz,
        title: "Camila Ruiz · Melbourne HO3 (bound)",
        pipelineStage: "bound",
        lineOfBusiness: "HO",
        shopLines: ["home"],
        coverageAmount: 402000,
        propertyOneliner: "880 Croton Rd, Melbourne, FL 32935 · 2004 masonry",
        currentCarrier: "American Integrity",
        boundAt: BOUND_AT,
        notes: "Closed won. Policy AI-HO-66102. Quote Sheet is fuller than Ana's open shop.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(risks)
    .values({
      id: HEALTH_RISK_ID,
      tenantId: TENANT_ID,
      dealId: HEALTH_DEAL_ID,
      contactId: OPP_CONTACT_IDS.ruiz,
      riskType: "property",
      address1: "880 Croton Rd",
      city: "Melbourne",
      county: "Brevard",
      state: "FL",
      zip: "32935",
      yearBuilt: 2004,
      construction: "masonry",
      occupancy: "owner",
      stories: 1,
      squareFeet: 2140,
      coverageA: 402000,
      roofYear: 2019,
      roofCovering: "architectural shingle",
      openingProtection: "impact",
      pool: false,
      protectionClass: "3",
      milesToCoast: 12,
      mobileHome: false,
      replacementCostEstimate: 398000,
    })
    .onConflictDoUpdate({
      target: risks.id,
      set: {
        dealId: HEALTH_DEAL_ID,
        contactId: OPP_CONTACT_IDS.ruiz,
        address1: "880 Croton Rd",
        city: "Melbourne",
        county: "Brevard",
        state: "FL",
        zip: "32935",
        yearBuilt: 2004,
        construction: "masonry",
        occupancy: "owner",
        stories: 1,
        squareFeet: 2140,
        coverageA: 402000,
        roofYear: 2019,
        roofCovering: "architectural shingle",
        openingProtection: "impact",
        protectionClass: "3",
        milesToCoast: 12,
        replacementCostEstimate: 398000,
        updatedAt: new Date(),
      },
    });

  const values = ruizHomeSheetValues();
  await db
    .insert(quoteSheets)
    .values({
      id: HEALTH_SHEET_ID,
      tenantId: TENANT_ID,
      dealId: HEALTH_DEAL_ID,
      line: "home",
      values,
    })
    .onConflictDoUpdate({
      target: quoteSheets.id,
      set: {
        dealId: HEALTH_DEAL_ID,
        line: "home",
        values,
        updatedAt: new Date(),
      },
    });

  await db
    .update(policies)
    .set({ dealId: HEALTH_DEAL_ID, riskId: HEALTH_RISK_ID, updatedAt: new Date() })
    .where(eq(policies.id, OPP_POLICY_IDS.ruizHo));

  await db
    .update(contacts)
    .set({ updatedAt: new Date() })
    .where(eq(contacts.id, OPP_CONTACT_IDS.ruiz));
}
