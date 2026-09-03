import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  accounts,
  activities,
  activityLogs,
  contactAccounts,
  contacts,
  deals,
  emailSendJobs,
  emailTemplates,
  emailTriggers,
  formTemplates,
  issuedCertificates,
  leads,
  locations,
  pipelineStages,
  pipelines,
  policies,
  quoteSheets,
  risks,
} from "./schema";
import {
  ANA_SHEET_ID,
  CONTACT_ID,
  DEAL_ID,
  ELENA_ACCOUNT_ID,
  ELENA_CONTACT_ID,
  ELENA_DEAL_ID,
  ELENA_EMAIL_JOB_ID,
  ELENA_POLICY_ID,
  EMAIL_REVIEW_ID,
  EMAIL_THANK_YOU_ID,
  FORM_HO3_ID,
  FORM_PACKET_ID,
  HARBOR_ACCOUNT_ID,
  HARBOR_CERTIFICATE_ID,
  HARBOR_CONTACT_ID,
  HARBOR_DEAL_ID,
  HARBOR_EMAIL_JOB_ID,
  HARBOR_LEAD_ID,
  HARBOR_LOCATION_ID,
  HARBOR_POLICY_ID,
  HARBOR_RISK_ID,
  HARBOR_SHEET_ID,
  HARBOR_TASK_ID,
  PIPELINE_FLOOD_ID,
  PIPELINE_HEALTH_ID,
  PIPELINE_LIFE_ID,
  PIPELINE_PC_ID,
  PIPELINE_WON_LOST_ID,
  RISK_ID,
  TENANT_ID,
  TRIGGER_REVIEW_ID,
  TRIGGER_THANK_YOU_ID,
} from "../fixtures/ids";
import fixture from "../fixtures/ana-dib-ho3-2026-09-02.json";
import type { QuoteSheetFieldValue } from "../domain";
import { FORM_TEMPLATE_SEEDS } from "../forms/catalog";
import { emptySheetValues } from "../lifecycle/quote-sheet";
import { activityLogBody } from "../lifecycle/activity";
import { SEEDED_PIPELINES } from "../wire/pipeline";
import { scheduleWonClientEmails } from "../wire/email-jobs";
import { buildCertificateDraft, nextCertificateNumber } from "../certificates/issue";

const PIPELINE_IDS: Record<string, string> = {
  "p-c": PIPELINE_PC_ID,
  health: PIPELINE_HEALTH_ID,
  life: PIPELINE_LIFE_ID,
  "won-lost": PIPELINE_WON_LOST_ID,
  flood: PIPELINE_FLOOD_ID,
};

function cell(
  value: string,
  status: QuoteSheetFieldValue["status"],
  source: QuoteSheetFieldValue["source"],
): QuoteSheetFieldValue {
  return { value, status, source };
}

export async function seedWireDesk() {
  await db.delete(pipelineStages).where(eq(pipelineStages.tenantId, TENANT_ID));
  await db.delete(pipelines).where(eq(pipelines.tenantId, TENANT_ID));

  for (const [index, board] of SEEDED_PIPELINES.entries()) {
    const id = PIPELINE_IDS[board.slug];
    await db.insert(pipelines).values({
      id,
      tenantId: TENANT_ID,
      name: board.name,
      slug: board.slug,
      kind: board.kind,
      seeded: board.seeded,
      sortOrder: index,
    });
    await db.insert(pipelineStages).values(
      board.stages.map((stage, sortOrder) => ({
        tenantId: TENANT_ID,
        pipelineId: id,
        name: stage.name,
        slug: stage.slug,
        sortOrder,
        seeded: board.seeded,
      })),
    );
  }

  const anaValues = emptySheetValues();
  Object.assign(anaValues, {
    address1: cell(fixture.risk.address1, "confirmed", "seed"),
    city: cell(fixture.risk.city, "confirmed", "seed"),
    county: cell(fixture.risk.county, "confirmed", "seed"),
    state: cell(fixture.risk.state, "confirmed", "seed"),
    zip: cell(fixture.risk.zip, "confirmed", "seed"),
    year_built: cell(String(fixture.risk.yearBuilt), "confirmed", "seed"),
    stories: cell(String(fixture.risk.stories), "confirmed", "seed"),
    construction: cell(fixture.risk.construction, "confirmed", "seed"),
    occupancy: cell(fixture.risk.occupancy, "confirmed", "seed"),
    roof_year: cell(String(fixture.risk.roofYear), "confirmed", "seed"),
    roof_covering: cell(fixture.risk.roofCovering, "confirmed", "seed"),
    opening_protection: cell(fixture.risk.openingProtection, "confirmed", "seed"),
    protection_class: cell(fixture.risk.protectionClass, "confirmed", "seed"),
    miles_to_coast: cell(String(fixture.risk.milesToCoast), "confirmed", "seed"),
    pool: cell(String(fixture.risk.pool), "confirmed", "seed"),
    coverage_a: cell(String(fixture.risk.coverageA), "confirmed", "javy"),
    current_carrier: cell("American Integrity", "confirmed", "seed"),
    notes: cell("Ana shop only. Quotes never created a policy.", "confirmed", "seed"),
  } satisfies Record<string, QuoteSheetFieldValue>);

  await db
    .insert(quoteSheets)
    .values({
      id: ANA_SHEET_ID,
      tenantId: TENANT_ID,
      dealId: DEAL_ID,
      line: "home",
      values: anaValues,
    })
    .onConflictDoUpdate({
      target: quoteSheets.id,
      set: { values: anaValues, updatedAt: new Date() },
    });

  await db
    .update(deals)
    .set({
      pipelineId: PIPELINE_PC_ID,
      pipelineStage: "shopping",
      pipelineStageSlug: "shopping",
      updatedAt: new Date(),
    })
    .where(eq(deals.id, DEAL_ID));

  await db
    .update(deals)
    .set({
      pipelineId: PIPELINE_PC_ID,
      pipelineStageSlug: "closed_won",
      wonAt: new Date("2026-09-01T15:00:00.000Z"),
      updatedAt: new Date(),
    })
    .where(eq(deals.id, ELENA_DEAL_ID));

  await db
    .update(accounts)
    .set({
      dba: "Ruiz Tile",
      ein: "59-7654321",
      entityType: "llc",
      employeeCount: 6,
      annualSales: "890000.00",
      payrollTotal: "240000.00",
      payrollW2: "180000.00",
      payroll1099: "60000.00",
      yearsInBusiness: 8,
      naics: "238340",
      operations: "Residential and light commercial tile. Linked to Elena Ruiz personal book.",
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, ELENA_ACCOUNT_ID));

  await db
    .insert(emailTemplates)
    .values([
      {
        id: EMAIL_THANK_YOU_ID,
        tenantId: TENANT_ID,
        slug: "thank-you",
        name: "Closed Won thank you",
        subject: "Thank you for binding with FitFirst",
        body: "Hung on won date. ARCHIVE must not cancel this.",
        locale: "en",
      },
      {
        id: EMAIL_REVIEW_ID,
        tenantId: TENANT_ID,
        slug: "google-review",
        name: "Google review ask",
        subject: "How did we do?",
        body: "Review ask hung on won date, not pipeline stage.",
        locale: "en",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(emailTriggers)
    .values([
      {
        id: TRIGGER_THANK_YOU_ID,
        tenantId: TENANT_ID,
        kind: "thank_you",
        name: "Won + 1 day thank you",
        delayDays: 1,
        templateId: EMAIL_THANK_YOU_ID,
        hangOff: "won_date",
        enabled: true,
      },
      {
        id: TRIGGER_REVIEW_ID,
        tenantId: TENANT_ID,
        kind: "google_review",
        name: "Won + 4 days review",
        delayDays: 4,
        templateId: EMAIL_REVIEW_ID,
        hangOff: "won_date",
        enabled: true,
      },
    ])
    .onConflictDoNothing();

  const elenaWon = new Date("2026-09-01T15:00:00.000Z");
  const [elenaThankYou] = scheduleWonClientEmails(elenaWon);
  await db
    .insert(emailSendJobs)
    .values({
      id: ELENA_EMAIL_JOB_ID,
      tenantId: TENANT_ID,
      triggerId: TRIGGER_THANK_YOU_ID,
      templateId: EMAIL_THANK_YOU_ID,
      contactId: ELENA_CONTACT_ID,
      dealId: ELENA_DEAL_ID,
      policyId: ELENA_POLICY_ID,
      anchorKind: "won_date",
      anchorAt: elenaWon,
      scheduledFor: elenaThankYou.scheduledFor,
      status: "queued",
    })
    .onConflictDoNothing();

  await db
    .insert(formTemplates)
    .values(
      FORM_TEMPLATE_SEEDS.map((seed, index) => ({
        id: index === 0 ? FORM_HO3_ID : FORM_PACKET_ID,
        tenantId: TENANT_ID,
        slug: seed.slug,
        name: seed.name,
        line: seed.line,
        status: "stub",
        family: seed.family,
        summary: seed.summary,
        fields: seed.fields,
      })),
    )
    .onConflictDoNothing();

  const harborValues = emptySheetValues();
  Object.assign(harborValues, {
    address1: cell("88 Harbor Key Blvd", "confirmed", "seed"),
    city: cell("Palm Bay", "confirmed", "seed"),
    county: cell("Brevard", "confirmed", "seed"),
    state: cell("FL", "confirmed", "seed"),
    zip: cell("32907", "confirmed", "seed"),
    occupancy: cell("marine contractor", "confirmed", "seed"),
    coverage_a: cell("0", "missing", "blank"),
    notes: cell("Commercial WC/GL shop. Bound after Closed Won.", "confirmed", "seed"),
  } satisfies Record<string, QuoteSheetFieldValue>);

  await db
    .insert(leads)
    .values({
      id: HARBOR_LEAD_ID,
      tenantId: TENANT_ID,
      firstName: "Marco",
      lastName: "Alvarez",
      email: "marco@harborkey.example",
      phone: "(321) 555-0144",
      source: "commercial_intake",
      status: "converted",
      notes: "Harbor Key Marine officer. Converted to a commercial deal; policy waited for bind.",
      convertedDealId: HARBOR_DEAL_ID,
    })
    .onConflictDoUpdate({
      target: leads.id,
      set: {
        firstName: "Marco",
        lastName: "Alvarez",
        convertedDealId: HARBOR_DEAL_ID,
        status: "converted",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(contacts)
    .values({
      id: HARBOR_CONTACT_ID,
      tenantId: TENANT_ID,
      firstName: "Marco",
      lastName: "Alvarez",
      email: "marco@harborkey.example",
      phone: "(321) 555-0144",
      mailingAddress: "88 Harbor Key Blvd",
      city: "Palm Bay",
      state: "FL",
      zip: "32907",
      tenureStart: new Date("2026-08-15T15:00:00.000Z"),
      policyCount: 0,
      activePolicyCount: 0,
      notes: "Officer contact. Personal book is empty; commercial policies live on Harbor Key Marine.",
    })
    .onConflictDoUpdate({
      target: contacts.id,
      set: {
        firstName: "Marco",
        lastName: "Alvarez",
        email: "marco@harborkey.example",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(accounts)
    .values({
      id: HARBOR_ACCOUNT_ID,
      tenantId: TENANT_ID,
      name: "Harbor Key Marine LLC",
      dba: "Harbor Key Marine",
      ein: "59-1234567",
      entityType: "llc",
      email: "office@harborkey.example",
      phone: "(321) 555-0144",
      mailingAddress: "88 Harbor Key Blvd",
      city: "Palm Bay",
      state: "FL",
      zip: "32907",
      employeeCount: 14,
      annualSales: "2150000.00",
      payrollTotal: "620000.00",
      payrollW2: "540000.00",
      payroll1099: "80000.00",
      yearsInBusiness: 11,
      naics: "336612",
      operations: "Boat repair and dock work. Demo commercial Closed Won.",
      tenureStart: new Date("2026-08-15T15:00:00.000Z"),
      policyCount: 1,
      activePolicyCount: 1,
      notes: "Commercial Closed Won demo. One GL policy after bind — quotes never created it.",
    })
    .onConflictDoUpdate({
      target: accounts.id,
      set: {
        name: "Harbor Key Marine LLC",
        ein: "59-1234567",
        employeeCount: 14,
        annualSales: "2150000.00",
        payrollW2: "540000.00",
        payroll1099: "80000.00",
        policyCount: 1,
        activePolicyCount: 1,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(contactAccounts)
    .values({
      tenantId: TENANT_ID,
      contactId: HARBOR_CONTACT_ID,
      accountId: HARBOR_ACCOUNT_ID,
      role: "principal",
    })
    .onConflictDoNothing();

  await db
    .insert(deals)
    .values({
      id: HARBOR_DEAL_ID,
      tenantId: TENANT_ID,
      leadId: HARBOR_LEAD_ID,
      contactId: HARBOR_CONTACT_ID,
      accountId: HARBOR_ACCOUNT_ID,
      title: "Harbor Key Marine · GL",
      pipelineStage: "bound",
      pipelineId: PIPELINE_PC_ID,
      pipelineStageSlug: "closed_won",
      lineOfBusiness: "GL",
      bindTarget: "account",
      state: "FL",
      primaryNamedInsured: "Harbor Key Marine LLC",
      notes: "Commercial bind. One GL policy after Closed Won.",
      boundAt: new Date("2026-08-15T15:00:00.000Z"),
      wonAt: new Date("2026-08-15T15:00:00.000Z"),
    })
    .onConflictDoUpdate({
      target: deals.id,
      set: {
        accountId: HARBOR_ACCOUNT_ID,
        pipelineId: PIPELINE_PC_ID,
        pipelineStage: "bound",
        pipelineStageSlug: "closed_won",
        bindTarget: "account",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(risks)
    .values({
      id: HARBOR_RISK_ID,
      tenantId: TENANT_ID,
      dealId: HARBOR_DEAL_ID,
      riskType: "property",
      address1: "88 Harbor Key Blvd",
      city: "Palm Bay",
      county: "Brevard",
      state: "FL",
      zip: "32907",
      occupancy: "marine contractor",
    })
    .onConflictDoNothing();

  await db
    .insert(quoteSheets)
    .values({
      id: HARBOR_SHEET_ID,
      tenantId: TENANT_ID,
      dealId: HARBOR_DEAL_ID,
      line: "general_liability",
      values: harborValues,
    })
    .onConflictDoUpdate({
      target: quoteSheets.id,
      set: { values: harborValues, updatedAt: new Date() },
    });

  await db
    .insert(policies)
    .values({
      id: HARBOR_POLICY_ID,
      tenantId: TENANT_ID,
      contactId: null,
      accountId: HARBOR_ACCOUNT_ID,
      dealId: HARBOR_DEAL_ID,
      riskId: HARBOR_RISK_ID,
      policyNumber: "GL-HARBOR-2026",
      lineOfBusiness: "GL",
      status: "active",
      effectiveDate: new Date("2026-08-15T05:00:00.000Z"),
      expirationDate: new Date("2027-08-15T05:00:00.000Z"),
      premium: "4180.00",
      premisesAddress: "88 Harbor Key Blvd",
      premisesCity: "Palm Bay",
      premisesState: "FL",
      premisesZip: "32907",
    })
    .onConflictDoUpdate({
      target: policies.id,
      set: {
        accountId: HARBOR_ACCOUNT_ID,
        contactId: null,
        status: "active",
        premisesAddress: "88 Harbor Key Blvd",
        premisesCity: "Palm Bay",
        premisesState: "FL",
        premisesZip: "32907",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(locations)
    .values({
      id: HARBOR_LOCATION_ID,
      tenantId: TENANT_ID,
      accountId: HARBOR_ACCOUNT_ID,
      kind: "job_site",
      label: "Harbor Key Blvd shop",
      address1: "88 Harbor Key Blvd",
      street: "88 Harbor Key Blvd",
      city: "Palm Bay",
      county: "Brevard",
      state: "FL",
      zip: "32907",
      occupancy: "commercial",
    })
    .onConflictDoUpdate({
      target: locations.id,
      set: {
        accountId: HARBOR_ACCOUNT_ID,
        address1: "88 Harbor Key Blvd",
        street: "88 Harbor Key Blvd",
        occupancy: "commercial",
        updatedAt: new Date(),
      },
    });

  const harborCoiAt = new Date("2026-08-20T15:00:00.000Z");
  const harborDraft = buildCertificateDraft(
    [
      {
        id: HARBOR_POLICY_ID,
        lineOfBusiness: "GL",
        status: "active",
        policyNumber: "GL-HARBOR-2026",
        carrierName: "Book GL",
        effectiveDate: new Date("2026-08-15T05:00:00.000Z"),
        expirationDate: new Date("2027-08-15T05:00:00.000Z"),
        coverageLimits: null,
      },
    ],
    {
      holderName: "Palm Bay Marina Dockage",
      holderAddress: "100 Harbour Way, Palm Bay, FL 32907",
      jobLocation: "88 Harbor Key Blvd slip repair",
    },
    harborCoiAt,
  );
  if (harborDraft.ok) {
    await db
      .insert(issuedCertificates)
      .values({
        id: HARBOR_CERTIFICATE_ID,
        tenantId: TENANT_ID,
        accountId: HARBOR_ACCOUNT_ID,
        businessId: HARBOR_ACCOUNT_ID,
        certificateNumber: nextCertificateNumber(0, harborCoiAt),
        holderName: harborDraft.draft.holderName,
        holderAddress: harborDraft.draft.holderAddress,
        jobLocation: harborDraft.draft.jobLocation,
        lines: harborDraft.draft.lines,
        producerName: "FitFirst",
        issuedAt: harborCoiAt,
        status: "issued",
      })
      .onConflictDoUpdate({
        target: issuedCertificates.id,
        set: {
          accountId: HARBOR_ACCOUNT_ID,
          certificateNumber: nextCertificateNumber(0, harborCoiAt),
          holderName: harborDraft.draft.holderName,
          holderAddress: harborDraft.draft.holderAddress,
          jobLocation: harborDraft.draft.jobLocation,
          lines: harborDraft.draft.lines,
        },
      });
  }

  await db
    .insert(activities)
    .values({
      id: HARBOR_TASK_ID,
      tenantId: TENANT_ID,
      kind: "task",
      title: "Harbor Key GL follow-up",
      notes: "Assigned to Business + Policy so 360 and the policy record share the row.",
      status: "open",
      dueAt: new Date("2026-09-14T15:00:00.000Z"),
      contactId: HARBOR_CONTACT_ID,
      accountId: HARBOR_ACCOUNT_ID,
      policyId: HARBOR_POLICY_ID,
      dealId: HARBOR_DEAL_ID,
    })
    .onConflictDoNothing();

  await db.delete(activityLogs).where(eq(activityLogs.activityId, HARBOR_TASK_ID));
  await db.insert(activityLogs).values({
    tenantId: TENANT_ID,
    activityId: HARBOR_TASK_ID,
    kind: "task",
    eventType: "created",
    body: activityLogBody("task", "created", "Harbor Key GL follow-up"),
    contactId: HARBOR_CONTACT_ID,
    accountId: HARBOR_ACCOUNT_ID,
    policyId: HARBOR_POLICY_ID,
    dealId: HARBOR_DEAL_ID,
  });

  const harborWon = new Date("2026-08-15T15:00:00.000Z");
  await db
    .insert(emailSendJobs)
    .values({
      id: HARBOR_EMAIL_JOB_ID,
      tenantId: TENANT_ID,
      triggerId: TRIGGER_REVIEW_ID,
      templateId: EMAIL_REVIEW_ID,
      accountId: HARBOR_ACCOUNT_ID,
      dealId: HARBOR_DEAL_ID,
      policyId: HARBOR_POLICY_ID,
      anchorKind: "won_date",
      anchorAt: harborWon,
      scheduledFor: scheduleWonClientEmails(harborWon)[1].scheduledFor,
      status: "queued",
    })
    .onConflictDoNothing();

  void CONTACT_ID;
  void RISK_ID;
}
