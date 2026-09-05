import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { writeSsn } from "@/lib/pii/write";
import { db } from "./index";
import {
  accounts,
  activities,
  activityLogs,
  clientHistory,
  contactAccounts,
  contacts,
  deals,
  documents,
  leads,
  locations,
  policies,
  quoteSheets,
  quotes,
  risks,
} from "./schema";
import {
  CARRIER_IDS,
  ELENA_ACCOUNT_ID,
  ELENA_BIZ_TASK_ID,
  ELENA_CALL_ID,
  ELENA_CONTACT_ID,
  ELENA_DEAL_ID,
  ELENA_DOC_DEC_ID,
  ELENA_DOC_POLICY_DEC_ID,
  ELENA_DOC_POLICY_ID_CARD_ID,
  ELENA_DOC_WIND_ID,
  ELENA_LEAD_ID,
  ELENA_LOCATION_ID,
  ELENA_MEETING_ID,
  ELENA_POLICY_ID,
  ELENA_QUOTE_AI_ID,
  ELENA_QUOTE_GEO_ID,
  ELENA_QUOTE_PDF_AI_ID,
  ELENA_QUOTE_PDF_GEO_ID,
  ELENA_QUOTE_PDF_TR_ID,
  ELENA_PROPOSAL_ID,
  ELENA_QUOTE_TAILROW_ID,
  ELENA_RISK_ID,
  ELENA_SHEET_ID,
  ELENA_TASK_ID,
  TENANT_ID,
} from "../fixtures/ids";
import { buildStubQuotePdf } from "../crm/quote-pdf";
import { buildBrandedProposalPdf } from "../proposals/branded-pdf";
import { compareQuotes, quoteToCompareInput } from "../quotes/gap-notes";
import { activityLogBody } from "../lifecycle/activity";
import {
  MELBOURNE_HO_DEC_FILENAME,
  MELBOURNE_HO_DEC_TEXT,
  MELBOURNE_WIND_MIT_FILENAME,
  MELBOURNE_WIND_MIT_TEXT,
} from "../fixtures/sample-docs";
import type { QuoteSheetFieldValue } from "../domain";
import { buildQuoteResultsNote } from "../lifecycle/quote-results";
import { emptySheetValues } from "../lifecycle/quote-sheet";

const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

function field(
  value: string,
  status: QuoteSheetFieldValue["status"],
  source: QuoteSheetFieldValue["source"],
): QuoteSheetFieldValue {
  return { value, status, source };
}

async function writeAttachment(
  id: string,
  filename: string,
  body: string,
  dealId: string,
): Promise<string> {
  const storagePath = path.join(TENANT_ID, dealId, `${id}-${filename}`);
  const abs = path.join(uploadRoot, storagePath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body, "utf8");
  return storagePath;
}

async function writePdfAttachment(
  id: string,
  filename: string,
  buffer: Buffer,
  dealId: string,
): Promise<string> {
  const storagePath = path.join(TENANT_ID, dealId, `${id}-${filename}`);
  const abs = path.join(uploadRoot, storagePath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, buffer);
  return storagePath;
}

/** Personal HO path besides Ana. Does not touch Ana IDs, Cov A, or appetite. */
export async function seedLifecycleDemo() {
  const sheetValues = emptySheetValues();
  Object.assign(sheetValues, {
    address1: field("412 Harbor Isle Dr", "confirmed", "seed"),
    city: field("Melbourne", "confirmed", "seed"),
    county: field("Brevard", "confirmed", "seed"),
    state: field("FL", "confirmed", "seed"),
    zip: field("32935", "confirmed", "seed"),
    year_built: field("2014", "confirmed", "seed"),
    stories: field("1", "confirmed", "seed"),
    construction: field("masonry", "confirmed", "seed"),
    occupancy: field("owner", "confirmed", "seed"),
    roof_year: field("2019", "confirmed", "seed"),
    roof_covering: field("architectural shingle", "confirmed", "seed"),
    opening_protection: field("full", "check", "extracted"),
    protection_class: field("3", "confirmed", "seed"),
    miles_to_coast: field("18", "confirmed", "seed"),
    pool: field("false", "confirmed", "seed"),
    coverage_a: field("385000", "confirmed", "seed"),
    current_carrier: field("Citizens", "check", "extracted"),
    hurricane_deductible: field("2%", "confirmed", "seed"),
    aop_deductible: field("$2,500", "confirmed", "seed"),
    notes: field("Bound HO3 click-through. Quotes stayed on the deal.", "confirmed", "seed"),
  } satisfies Record<string, QuoteSheetFieldValue>);

  await db
    .insert(leads)
    .values({
      id: ELENA_LEAD_ID,
      tenantId: TENANT_ID,
      firstName: "Elena",
      lastName: "Ruiz",
      email: "elena.ruiz@example.com",
      phone: "(321) 555-0188",
      mailingAddress: "412 Harbor Isle Dr",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
      dateOfBirth: "1984-03-12",
      insuranceTypeDesired: "HO",
      preferredLanguage: "en",
      source: "dropped_dec",
      status: "converted",
      notes:
        "Personal HO path. Arrived as a dropped dec packet. Converted to a deal; policy waited for bind.",
      convertedDealId: ELENA_DEAL_ID,
    })
    .onConflictDoUpdate({
      target: leads.id,
      set: {
        firstName: "Elena",
        lastName: "Ruiz",
        email: "elena.ruiz@example.com",
        phone: "(321) 555-0188",
        mailingAddress: "412 Harbor Isle Dr",
        city: "Melbourne",
        state: "FL",
        zip: "32935",
        dateOfBirth: "1984-03-12",
        insuranceTypeDesired: "HO",
        preferredLanguage: "en",
        source: "dropped_dec",
        status: "converted",
        convertedDealId: ELENA_DEAL_ID,
        notes:
          "Personal HO path. Arrived as a dropped dec packet. Converted to a deal; policy waited for bind.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(contacts)
    .values({
      id: ELENA_CONTACT_ID,
      tenantId: TENANT_ID,
      firstName: "Elena",
      lastName: "Ruiz",
      email: "elena.ruiz@example.com",
      phone: "(321) 555-0188",
      mailingAddress: "412 Harbor Isle Dr",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
      tenureStart: new Date("2026-09-01T15:00:00.000Z"),
      policyCount: 1,
      activePolicyCount: 1,
      ...writeSsn("000-00-4444"),
      notes:
        "Created at bind from the Melbourne HO3 deal. Fields copied from the lead + risk. Linked to Ruiz Tile LLC without moving personal policies onto the business.",
    })
    .onConflictDoUpdate({
      target: contacts.id,
      set: {
        firstName: "Elena",
        lastName: "Ruiz",
        email: "elena.ruiz@example.com",
        phone: "(321) 555-0188",
        mailingAddress: "412 Harbor Isle Dr",
        city: "Melbourne",
        state: "FL",
        zip: "32935",
        tenureStart: new Date("2026-09-01T15:00:00.000Z"),
        policyCount: 1,
        activePolicyCount: 1,
        ...writeSsn("000-00-4444"),
        notes:
          "Created at bind from the Melbourne HO3 deal. Fields copied from the lead + risk. Linked to Ruiz Tile LLC without moving personal policies onto the business.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(locations)
    .values({
      id: ELENA_LOCATION_ID,
      tenantId: TENANT_ID,
      contactId: ELENA_CONTACT_ID,
      kind: "property",
      label: "Harbor Isle dwelling",
      address1: "412 Harbor Isle Dr",
      street: "412 Harbor Isle Dr",
      city: "Melbourne",
      county: "Brevard",
      state: "FL",
      zip: "32935",
      occupancy: "owner",
    })
    .onConflictDoUpdate({
      target: locations.id,
      set: {
        contactId: ELENA_CONTACT_ID,
        address1: "412 Harbor Isle Dr",
        street: "412 Harbor Isle Dr",
        city: "Melbourne",
        occupancy: "owner",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(accounts)
    .values({
      id: ELENA_ACCOUNT_ID,
      tenantId: TENANT_ID,
      name: "Ruiz Tile LLC",
      email: "office@ruiztile.example",
      phone: "(321) 555-0188",
      mailingAddress: "412 Harbor Isle Dr",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
      policyCount: 0,
      activePolicyCount: 0,
      notes:
        "Commercial account linked to Elena Ruiz. No commercial policy yet — personal HO3 stays on the Contact.",
    })
    .onConflictDoUpdate({
      target: accounts.id,
      set: {
        name: "Ruiz Tile LLC",
        email: "office@ruiztile.example",
        phone: "(321) 555-0188",
        policyCount: 0,
        activePolicyCount: 0,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(contactAccounts)
    .values({
      id: "44444444-4444-4444-8444-444444444450",
      tenantId: TENANT_ID,
      contactId: ELENA_CONTACT_ID,
      accountId: ELENA_ACCOUNT_ID,
      role: "principal",
    })
    .onConflictDoNothing();

  const quoteResultsNote = buildQuoteResultsNote([
    { carrierName: "American Integrity", premium: "2840", bindable: true },
    { carrierName: "Tailrow", premium: "3120", bindable: true },
    { carrierName: "GeoVera", premium: "3640", bindable: true },
  ]);

  await db
    .insert(deals)
    .values({
      id: ELENA_DEAL_ID,
      tenantId: TENANT_ID,
      leadId: ELENA_LEAD_ID,
      contactId: ELENA_CONTACT_ID,
      accountId: ELENA_ACCOUNT_ID,
      title: "Ruiz · Melbourne HO3",
      pipelineStage: "bound",
      lineOfBusiness: "HO",
      bindTarget: "contact",
      state: "FL",
      primaryNamedInsured: "Elena Ruiz",
      quoteResultsNote,
      notes:
        "Personal HO click-through. Source docs + issued quote PDFs on the deal. Bound 2026-09-01 — one HO3 policy after accept, not from the quotes.",
      videoProposalUrl: "https://fitfirst.example/video/ruiz-melbourne-ho3",
      boundAt: new Date("2026-09-01T15:00:00.000Z"),
    })
    .onConflictDoUpdate({
      target: deals.id,
      set: {
        leadId: ELENA_LEAD_ID,
        contactId: ELENA_CONTACT_ID,
        accountId: ELENA_ACCOUNT_ID,
        title: "Ruiz · Melbourne HO3",
        pipelineStage: "bound",
        lineOfBusiness: "HO",
        bindTarget: "contact",
        quoteResultsNote,
        notes:
          "Personal HO click-through. Source docs + issued quote PDFs on the deal. Bound 2026-09-01 — one HO3 policy after accept, not from the quotes.",
        videoProposalUrl: "https://fitfirst.example/video/ruiz-melbourne-ho3",
        boundAt: new Date("2026-09-01T15:00:00.000Z"),
        updatedAt: new Date(),
      },
    });

  await db
    .insert(risks)
    .values({
      id: ELENA_RISK_ID,
      tenantId: TENANT_ID,
      dealId: ELENA_DEAL_ID,
      contactId: ELENA_CONTACT_ID,
      riskType: "property",
      address1: "412 Harbor Isle Dr",
      city: "Melbourne",
      county: "Brevard",
      state: "FL",
      zip: "32935",
      yearBuilt: 2014,
      construction: "masonry",
      occupancy: "owner",
      stories: 1,
      coverageA: 385000,
      roofYear: 2019,
      roofCovering: "architectural shingle",
      openingProtection: "full",
      pool: false,
      protectionClass: "3",
      milesToCoast: 18,
      mobileHome: false,
    })
    .onConflictDoUpdate({
      target: risks.id,
      set: {
        dealId: ELENA_DEAL_ID,
        contactId: ELENA_CONTACT_ID,
        address1: "412 Harbor Isle Dr",
        city: "Melbourne",
        county: "Brevard",
        coverageA: 385000,
        yearBuilt: 2014,
        construction: "masonry",
        roofYear: 2019,
        roofCovering: "architectural shingle",
        openingProtection: "full",
        milesToCoast: 18,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(quoteSheets)
    .values({
      id: ELENA_SHEET_ID,
      tenantId: TENANT_ID,
      dealId: ELENA_DEAL_ID,
      line: "home",
      values: sheetValues as typeof quoteSheets.$inferInsert.values,
    })
    .onConflictDoUpdate({
      target: quoteSheets.id,
      set: { values: sheetValues as typeof quoteSheets.$inferInsert.values, updatedAt: new Date() },
    });

  await db.delete(quotes).where(eq(quotes.dealId, ELENA_DEAL_ID));
  await db.insert(quotes).values([
    {
      id: ELENA_QUOTE_AI_ID,
      tenantId: TENANT_ID,
      dealId: ELENA_DEAL_ID,
      riskId: ELENA_RISK_ID,
      carrierId: CARRIER_IDS.americanIntegrity,
      quoteNumber: "Q-AI-MEL-2840",
      premium: "2840.00",
      hurricaneDeductible: "2%",
      aopDeductible: "$2,500",
      coverageA: 385000,
      bindable: true,
      coverageGaps: [],
      notes: "Stub quote. Cheapest. Did not create a policy.",
      stub: true,
    },
    {
      id: ELENA_QUOTE_TAILROW_ID,
      tenantId: TENANT_ID,
      dealId: ELENA_DEAL_ID,
      riskId: ELENA_RISK_ID,
      carrierId: CARRIER_IDS.tailrow,
      quoteNumber: "Q-TR-MEL-3120",
      premium: "3120.00",
      hurricaneDeductible: "2%",
      aopDeductible: "$2,500",
      coverageA: 385000,
      bindable: true,
      coverageGaps: ["No flood"],
      notes: "Stub quote. Second cheapest. Florida HO3 — flood not included.",
      stub: true,
    },
    {
      id: ELENA_QUOTE_GEO_ID,
      tenantId: TENANT_ID,
      dealId: ELENA_DEAL_ID,
      riskId: ELENA_RISK_ID,
      carrierId: CARRIER_IDS.geovera,
      quoteNumber: "Q-GV-MEL-3640",
      premium: "3640.00",
      hurricaneDeductible: "5%",
      aopDeductible: "$5,000",
      coverageA: 365000,
      bindable: true,
      coverageGaps: ["No flood"],
      notes: "Higher deductibles. Coverage A $20,000 short of the $385,000 need. No flood.",
      stub: true,
    },
  ]);

  await db
    .insert(policies)
    .values({
      id: ELENA_POLICY_ID,
      tenantId: TENANT_ID,
      contactId: ELENA_CONTACT_ID,
      dealId: ELENA_DEAL_ID,
      riskId: ELENA_RISK_ID,
      carrierId: CARRIER_IDS.americanIntegrity,
      policyNumber: "HO3-ELENA-2026",
      lineOfBusiness: "HO",
      status: "active",
      effectiveDate: new Date("2026-09-01T05:00:00.000Z"),
      expirationDate: new Date("2027-09-01T05:00:00.000Z"),
      renewalDate: new Date("2027-09-01T05:00:00.000Z"),
      premium: "2840.00",
      coverageA: 385000,
      formType: "HO3",
      policyType: "Home",
      policySubType: "HO3",
      billingFrequency: "annual",
      sellingAgency: "afa",
      commission4Pct: "10",
      premisesAddress: "412 Harbor Isle Dr",
      premisesCity: "Melbourne",
      premisesState: "FL",
      premisesZip: "32935",
    })
    .onConflictDoUpdate({
      target: policies.id,
      set: {
        contactId: ELENA_CONTACT_ID,
        dealId: ELENA_DEAL_ID,
        status: "active",
        endedAt: null,
        endReason: null,
        policyNumber: "HO3-ELENA-2026",
        premium: "2840.00",
        coverageA: 385000,
        formType: "HO3",
        policyType: "Home",
        policySubType: "HO3",
        billingFrequency: "annual",
        sellingAgency: "afa",
        commission4Pct: "10",
        renewalDate: new Date("2027-09-01T05:00:00.000Z"),
        premisesAddress: "412 Harbor Isle Dr",
        premisesCity: "Melbourne",
        premisesState: "FL",
        premisesZip: "32935",
        updatedAt: new Date(),
      },
    });

  const decPath = await writeAttachment(
    "src-dec",
    MELBOURNE_HO_DEC_FILENAME,
    MELBOURNE_HO_DEC_TEXT,
    ELENA_DEAL_ID,
  );
  const windPath = await writeAttachment(
    "src-wind",
    MELBOURNE_WIND_MIT_FILENAME,
    MELBOURNE_WIND_MIT_TEXT,
    ELENA_DEAL_ID,
  );
  const quoteAiPath = await writePdfAttachment(
    ELENA_QUOTE_PDF_AI_ID,
    "american-integrity-quote-2840.pdf",
    await buildStubQuotePdf({
      dealTitle: "Ruiz · Melbourne HO3",
      carrierName: "American Integrity",
      quoteNumber: "Q-AI-MEL-2840",
      premium: "2840.00",
      coverageA: 385000,
      hurricaneDeductible: "2%",
      aopDeductible: "$2,500",
      bindable: true,
    }),
    ELENA_DEAL_ID,
  );
  const quoteTrPath = await writePdfAttachment(
    ELENA_QUOTE_PDF_TR_ID,
    "tailrow-quote-3120.pdf",
    await buildStubQuotePdf({
      dealTitle: "Ruiz · Melbourne HO3",
      carrierName: "Tailrow",
      quoteNumber: "Q-TR-MEL-3120",
      premium: "3120.00",
      coverageA: 385000,
      hurricaneDeductible: "2%",
      aopDeductible: "$2,500",
      bindable: true,
    }),
    ELENA_DEAL_ID,
  );
  const quoteGvPath = await writePdfAttachment(
    ELENA_QUOTE_PDF_GEO_ID,
    "geovera-quote-3640.pdf",
    await buildStubQuotePdf({
      dealTitle: "Ruiz · Melbourne HO3",
      carrierName: "GeoVera",
      quoteNumber: "Q-GV-MEL-3640",
      premium: "3640.00",
      coverageA: 365000,
      hurricaneDeductible: "5%",
      aopDeductible: "$5,000",
      bindable: true,
    }),
    ELENA_DEAL_ID,
  );
  const proposalPath = await writePdfAttachment(
    ELENA_PROPOSAL_ID,
    "proposal-Ruiz_Melbourne_HO3.pdf",
    await buildBrandedProposalPdf({
      brand: { agencyName: "Javier Garcia Insurance", colorPreset: "agency", phone: "321-429-1182" },
      deal: {
        title: "Ruiz · Melbourne HO3",
        insuredName: "Elena Ruiz",
        line: "HO",
        state: "FL",
        coverageA: 385000,
      },
      quotes: compareQuotes(
        [
          quoteToCompareInput({
            id: ELENA_QUOTE_AI_ID,
            carrierName: "American Integrity",
            premium: "2840.00",
            aopDeductible: "$2,500",
            hurricaneDeductible: "2%",
            coverageA: 385000,
            bindable: true,
            coverageGaps: [],
            notes: "Cheapest.",
          }),
          quoteToCompareInput({
            id: ELENA_QUOTE_TAILROW_ID,
            carrierName: "Tailrow",
            premium: "3120.00",
            aopDeductible: "$2,500",
            hurricaneDeductible: "2%",
            coverageA: 385000,
            bindable: true,
            coverageGaps: ["No flood"],
            notes: "No flood.",
          }),
          quoteToCompareInput({
            id: ELENA_QUOTE_GEO_ID,
            carrierName: "GeoVera",
            premium: "3640.00",
            aopDeductible: "$5,000",
            hurricaneDeductible: "5%",
            coverageA: 365000,
            bindable: true,
            coverageGaps: ["No flood"],
            notes: "Higher deductibles. No flood.",
          }),
        ],
        { coverageA: 385000, state: "FL", line: "HO", wantsFlood: true },
      ),
    }),
    ELENA_DEAL_ID,
  );
  const polDecPath = await writeAttachment(
    "pol-dec",
    "ho3-elena-2026-dec.txt",
    "ISSUED POLICY DECLARATIONS\nPolicy HO3-ELENA-2026\nAmerican Integrity · Elena Ruiz\n412 Harbor Isle Dr, Melbourne FL 32935\nEffective 2026-09-01 · Premium $2,840 · Cov A $385,000\nIssued after bind. Not a shopping document.\n",
    ELENA_DEAL_ID,
  );
  const polIdPath = await writeAttachment(
    "pol-id",
    "ho3-elena-2026-id-card.txt",
    "INSURANCE ID CARD\nElena Ruiz\nHO3-ELENA-2026\nAmerican Integrity\nEffective 2026-09-01 to 2027-09-01\nIssued after bind.\n",
    ELENA_DEAL_ID,
  );

  await db.delete(documents).where(eq(documents.dealId, ELENA_DEAL_ID));
  await db.insert(documents).values([
    {
      id: ELENA_DOC_DEC_ID,
      tenantId: TENANT_ID,
      riskId: ELENA_RISK_ID,
      dealId: ELENA_DEAL_ID,
      contactId: ELENA_CONTACT_ID,
      filename: MELBOURNE_HO_DEC_FILENAME,
      mimeType: "text/plain",
      storagePath: decPath,
      docType: "dec",
      slot: "source_doc",
      status: "extracted",
    },
    {
      id: ELENA_DOC_WIND_ID,
      tenantId: TENANT_ID,
      riskId: ELENA_RISK_ID,
      dealId: ELENA_DEAL_ID,
      contactId: ELENA_CONTACT_ID,
      filename: MELBOURNE_WIND_MIT_FILENAME,
      mimeType: "text/plain",
      storagePath: windPath,
      docType: "wind_mit",
      slot: "source_doc",
      status: "extracted",
    },
    {
      id: ELENA_QUOTE_PDF_AI_ID,
      tenantId: TENANT_ID,
      riskId: ELENA_RISK_ID,
      dealId: ELENA_DEAL_ID,
      contactId: ELENA_CONTACT_ID,
      filename: "american-integrity-quote-2840.pdf",
      mimeType: "application/pdf",
      storagePath: quoteAiPath,
      docType: "quote_pdf",
      slot: "quote_pdf",
      status: "uploaded",
    },
    {
      id: ELENA_QUOTE_PDF_TR_ID,
      tenantId: TENANT_ID,
      riskId: ELENA_RISK_ID,
      dealId: ELENA_DEAL_ID,
      contactId: ELENA_CONTACT_ID,
      filename: "tailrow-quote-3120.pdf",
      mimeType: "application/pdf",
      storagePath: quoteTrPath,
      docType: "quote_pdf",
      slot: "quote_pdf",
      status: "uploaded",
    },
    {
      id: ELENA_QUOTE_PDF_GEO_ID,
      tenantId: TENANT_ID,
      riskId: ELENA_RISK_ID,
      dealId: ELENA_DEAL_ID,
      contactId: ELENA_CONTACT_ID,
      filename: "geovera-quote-3640.pdf",
      mimeType: "application/pdf",
      storagePath: quoteGvPath,
      docType: "quote_pdf",
      slot: "quote_pdf",
      status: "uploaded",
    },
    {
      id: ELENA_PROPOSAL_ID,
      tenantId: TENANT_ID,
      riskId: ELENA_RISK_ID,
      dealId: ELENA_DEAL_ID,
      contactId: ELENA_CONTACT_ID,
      filename: "proposal-Ruiz_Melbourne_HO3.pdf",
      mimeType: "application/pdf",
      storagePath: proposalPath,
      docType: "proposal",
      slot: "proposal",
      status: "attached",
    },
    {
      id: ELENA_DOC_POLICY_DEC_ID,
      tenantId: TENANT_ID,
      dealId: ELENA_DEAL_ID,
      policyId: ELENA_POLICY_ID,
      contactId: ELENA_CONTACT_ID,
      filename: "ho3-elena-2026-dec.txt",
      mimeType: "text/plain",
      storagePath: polDecPath,
      docType: "policy_dec",
      slot: "policy_file",
      status: "uploaded",
    },
    {
      id: ELENA_DOC_POLICY_ID_CARD_ID,
      tenantId: TENANT_ID,
      dealId: ELENA_DEAL_ID,
      policyId: ELENA_POLICY_ID,
      contactId: ELENA_CONTACT_ID,
      filename: "ho3-elena-2026-id-card.txt",
      mimeType: "text/plain",
      storagePath: polIdPath,
      docType: "policy_id",
      slot: "policy_file",
      status: "uploaded",
    },
  ]);

  await db
    .insert(clientHistory)
    .values({
      id: "44444444-4444-4444-8444-444444444460",
      tenantId: TENANT_ID,
      contactId: ELENA_CONTACT_ID,
      accountId: ELENA_ACCOUNT_ID,
      dealId: ELENA_DEAL_ID,
      policyId: ELENA_POLICY_ID,
      eventType: "bind",
      body: "Bound HO HO3-ELENA-2026. Policy created only after bind — quotes stayed on the deal.",
      occurredAt: new Date("2026-09-01T15:05:00.000Z"),
    })
    .onConflictDoUpdate({
      target: clientHistory.id,
      set: {
        contactId: ELENA_CONTACT_ID,
        accountId: ELENA_ACCOUNT_ID,
        policyId: ELENA_POLICY_ID,
        body: "Bound HO HO3-ELENA-2026. Policy created only after bind — quotes stayed on the deal.",
      },
    });

  const seededActivities = [
    {
      id: ELENA_TASK_ID,
      kind: "task",
      title: "30-day HO3 check-in",
      notes: "Assigned to Elena + HO3-ELENA-2026.",
      status: "open",
      dueAt: new Date("2026-10-01T15:00:00.000Z"),
      contactId: ELENA_CONTACT_ID,
      accountId: null as string | null,
      policyId: ELENA_POLICY_ID,
      dealId: ELENA_DEAL_ID,
      eventType: "created",
      at: new Date("2026-09-01T15:10:00.000Z"),
    },
    {
      id: ELENA_MEETING_ID,
      kind: "meeting",
      title: "Review bound HO3 with Elena",
      notes: "In-desk meeting, not a calendar sync.",
      status: "completed",
      dueAt: new Date("2026-09-02T14:00:00.000Z"),
      contactId: ELENA_CONTACT_ID,
      accountId: null,
      policyId: ELENA_POLICY_ID,
      dealId: ELENA_DEAL_ID,
      eventType: "created",
      at: new Date("2026-09-01T16:00:00.000Z"),
    },
    {
      id: ELENA_CALL_ID,
      kind: "call",
      title: "Bind confirmation call",
      notes: "Logged call — not a softphone. Sibling agent owns dialing.",
      status: "completed",
      dueAt: null,
      contactId: ELENA_CONTACT_ID,
      accountId: null,
      policyId: ELENA_POLICY_ID,
      dealId: ELENA_DEAL_ID,
      eventType: "logged",
      at: new Date("2026-09-01T15:20:00.000Z"),
    },
    {
      id: ELENA_BIZ_TASK_ID,
      kind: "task",
      title: "Ask Elena about GL for Ruiz Tile LLC",
      notes: "Business-linked task. No commercial policy yet.",
      status: "open",
      dueAt: new Date("2026-09-15T15:00:00.000Z"),
      contactId: ELENA_CONTACT_ID,
      accountId: ELENA_ACCOUNT_ID,
      policyId: null,
      dealId: ELENA_DEAL_ID,
      eventType: "created",
      at: new Date("2026-09-01T17:00:00.000Z"),
    },
  ];

  for (const row of seededActivities) {
    await db
      .insert(activities)
      .values({
        id: row.id,
        tenantId: TENANT_ID,
        kind: row.kind,
        title: row.title,
        notes: row.notes,
        status: row.status,
        dueAt: row.dueAt,
        contactId: row.contactId,
        accountId: row.accountId,
        policyId: row.policyId,
        dealId: row.dealId,
      })
      .onConflictDoUpdate({
        target: activities.id,
        set: {
          title: row.title,
          notes: row.notes,
          status: row.status,
          contactId: row.contactId,
          accountId: row.accountId,
          policyId: row.policyId,
          updatedAt: new Date(),
        },
      });
  }

  await db.delete(activityLogs).where(eq(activityLogs.dealId, ELENA_DEAL_ID));
  await db.insert(activityLogs).values(
    seededActivities.map((row) => ({
      tenantId: TENANT_ID,
      activityId: row.id,
      kind: row.kind,
      eventType: row.eventType,
      body: activityLogBody(row.kind, row.eventType, row.title),
      occurredAt: row.at,
      contactId: row.contactId,
      accountId: row.accountId,
      policyId: row.policyId,
      dealId: row.dealId,
    })),
  );
}
