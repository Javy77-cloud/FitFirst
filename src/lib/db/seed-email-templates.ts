import { and, eq } from "drizzle-orm";
import { AGENCY_BRAND, EMAIL_JOB_HOLD } from "@/lib/domain";
import { db } from "./index";
import {
  clientHistory,
  contacts,
  deals,
  emailSendAccounts,
  emailSendJobs,
  emailTemplates,
  emailTriggers,
  leads,
  policies,
} from "./schema";
import {
  DEMO_CLIENT,
  EMAIL_SEND_ACCOUNT_IDS,
  EMAIL_TEMPLATE_IDS,
  EMAIL_TRIGGER_IDS,
  TENANT_ID,
} from "../fixtures/ids";
import { SEEDED_TEMPLATE_COPY } from "../templates/copy";
import { mergeTemplate } from "../templates/merge";

const WON_AT = new Date("2026-08-30T16:00:00.000Z");
const REVIEW_AT = new Date("2026-09-03T16:00:00.000Z");
const EFFECTIVE = new Date("2025-10-18T16:00:00.000Z");
const EXPIRATION = new Date("2026-10-18T16:00:00.000Z");

export async function seedEmailTemplates() {
  const review = SEEDED_TEMPLATE_COPY.googleReview;
  const checkin = SEEDED_TEMPLATE_COPY.checkin4mo;
  const renewal = SEEDED_TEMPLATE_COPY.renewal;

  await db
    .insert(emailTemplates)
    .values([
      {
        id: EMAIL_TEMPLATE_IDS.googleReview,
        tenantId: TENANT_ID,
        slug: review.slug,
        name: review.name,
        kind: review.kind,
        subjectEn: review.subjectEn,
        bodyEn: review.bodyEn,
        subjectEs: review.subjectEs,
        bodyEs: review.bodyEs,
        isSeeded: true,
        isExampleCopy: true,
      },
      {
        id: EMAIL_TEMPLATE_IDS.checkin4mo,
        tenantId: TENANT_ID,
        slug: checkin.slug,
        name: checkin.name,
        kind: checkin.kind,
        subjectEn: checkin.subjectEn,
        bodyEn: checkin.bodyEn,
        subjectEs: checkin.subjectEs,
        bodyEs: checkin.bodyEs,
        isSeeded: true,
        isExampleCopy: true,
      },
      {
        id: EMAIL_TEMPLATE_IDS.renewal,
        tenantId: TENANT_ID,
        slug: renewal.slug,
        name: renewal.name,
        kind: renewal.kind,
        subjectEn: renewal.subjectEn,
        bodyEn: renewal.bodyEn,
        subjectEs: renewal.subjectEs,
        bodyEs: renewal.bodyEs,
        isSeeded: true,
        isExampleCopy: true,
      },
    ])
    .onConflictDoNothing({ target: emailTemplates.id });

  // Re-apply seeded bodies only when still marked example copy — Javy's edits stick.
  for (const row of [
    { id: EMAIL_TEMPLATE_IDS.googleReview, copy: review },
    { id: EMAIL_TEMPLATE_IDS.checkin4mo, copy: checkin },
    { id: EMAIL_TEMPLATE_IDS.renewal, copy: renewal },
  ]) {
    await db
      .update(emailTemplates)
      .set({
        slug: row.copy.slug,
        name: row.copy.name,
        kind: row.copy.kind,
        subjectEn: row.copy.subjectEn,
        bodyEn: row.copy.bodyEn,
        subjectEs: row.copy.subjectEs,
        bodyEs: row.copy.bodyEs,
        isSeeded: true,
        updatedAt: new Date(),
      })
      .where(
        and(eq(emailTemplates.id, row.id), eq(emailTemplates.isExampleCopy, true)),
      );
  }

  await db
    .insert(emailTriggers)
    .values([
      {
        id: EMAIL_TRIGGER_IDS.wonReview,
        tenantId: TENANT_ID,
        slug: "closed-won-google-review",
        name: "Closed Won + 4 days · Google review",
        eventKind: "closed_won",
        delayAmount: 4,
        delayUnit: "days",
        templateId: EMAIL_TEMPLATE_IDS.googleReview,
        sendFromProvider: "google",
        enabled: true,
        emailClient: true,
        createBrokerTask: false,
      },
      {
        id: EMAIL_TRIGGER_IDS.wonCheckin,
        tenantId: TENANT_ID,
        slug: "closed-won-4-month-checkin",
        name: "Closed Won + 4 months · check-in",
        eventKind: "closed_won",
        delayAmount: 4,
        delayUnit: "months",
        templateId: EMAIL_TEMPLATE_IDS.checkin4mo,
        sendFromProvider: "google",
        enabled: true,
        emailClient: true,
        createBrokerTask: false,
      },
      {
        id: EMAIL_TRIGGER_IDS.renewal60,
        tenantId: TENANT_ID,
        slug: "renewal-60",
        name: "Policy renewal · 60 days",
        eventKind: "policy_renewal",
        delayAmount: 60,
        delayUnit: "days",
        templateId: EMAIL_TEMPLATE_IDS.renewal,
        sendFromProvider: "google",
        enabled: true,
        emailClient: true,
        createBrokerTask: true,
      },
      {
        id: EMAIL_TRIGGER_IDS.renewal30,
        tenantId: TENANT_ID,
        slug: "renewal-30",
        name: "Policy renewal · 30 days",
        eventKind: "policy_renewal",
        delayAmount: 30,
        delayUnit: "days",
        templateId: EMAIL_TEMPLATE_IDS.renewal,
        sendFromProvider: "google",
        enabled: true,
        emailClient: true,
        createBrokerTask: true,
      },
    ])
    .onConflictDoNothing({ target: emailTriggers.id });

  const accounts = [
    { id: EMAIL_SEND_ACCOUNT_IDS.google, provider: "google", email: "desk@javiergarcia.example" },
    {
      id: EMAIL_SEND_ACCOUNT_IDS.outlook,
      provider: "outlook",
      email: "desk@javiergarcia.onmicrosoft.example",
    },
    { id: EMAIL_SEND_ACCOUNT_IDS.yahoo, provider: "yahoo", email: "desk@yahoo.example" },
    { id: EMAIL_SEND_ACCOUNT_IDS.zoho_mail, provider: "zoho_mail", email: "desk@zoho.example" },
    { id: EMAIL_SEND_ACCOUNT_IDS.imap, provider: "imap", email: "desk@imap.example" },
  ] as const;

  for (const account of accounts) {
    await db
      .insert(emailSendAccounts)
      .values({
        id: account.id,
        tenantId: TENANT_ID,
        provider: account.provider,
        status: "disconnected",
        accountEmail: account.email,
      })
      .onConflictDoNothing({ target: emailSendAccounts.id });
  }

  await db
    .insert(leads)
    .values({
      id: DEMO_CLIENT.leadId,
      tenantId: TENANT_ID,
      firstName: "Marcus",
      lastName: "Bell",
      email: "marcus.bell@example.com",
      phone: "321-555-0144",
      source: "book",
      status: "converted",
      notes: "Existing-book HO client used for email-trigger demo. Not Ana.",
      convertedDealId: DEMO_CLIENT.dealId,
    })
    .onConflictDoNothing({ target: leads.id });

  await db
    .insert(contacts)
    .values({
      id: DEMO_CLIENT.contactId,
      tenantId: TENANT_ID,
      firstName: "Marcus",
      lastName: "Bell",
      email: "marcus.bell@example.com",
      phone: "321-555-0144",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
      preferredLanguage: "english",
      tenureStart: WON_AT,
      policyCount: 1,
      notes: "Closed-won demo contact for client email triggers. Do not confuse with Ana Dib.",
    })
    .onConflictDoNothing({ target: contacts.id });

  await db
    .insert(deals)
    .values({
      id: DEMO_CLIENT.dealId,
      tenantId: TENANT_ID,
      leadId: DEMO_CLIENT.leadId,
      contactId: DEMO_CLIENT.contactId,
      title: "Bell · Melbourne HO",
      pipelineStage: "bound",
      lineOfBusiness: "HO",
      state: "FL",
      primaryNamedInsured: "Marcus Bell",
      boundAt: WON_AT,
      wonAt: WON_AT,
      notes: "Demo Closed Won. Archive this deal to confirm review/check-in jobs stay queued.",
    })
    .onConflictDoNothing({ target: deals.id });

  await db
    .insert(policies)
    .values({
      id: DEMO_CLIENT.policyId,
      tenantId: TENANT_ID,
      contactId: DEMO_CLIENT.contactId,
      dealId: DEMO_CLIENT.dealId,
      policyNumber: "FF-BELL-HO",
      lineOfBusiness: "HO",
      status: "active",
      effectiveDate: EFFECTIVE,
      expirationDate: EXPIRATION,
      premium: "1842.00",
    })
    .onConflictDoNothing({ target: policies.id });

  const rendered = {
    subject: mergeTemplate(review.subjectEn, {
      contactFirstName: "Marcus",
      agencyName: AGENCY_BRAND.name,
      policyType: "HO",
      wonDate: WON_AT,
    }),
    body: mergeTemplate(review.bodyEn, {
      contactFirstName: "Marcus",
      agencyName: AGENCY_BRAND.name,
      policyType: "HO",
      wonDate: WON_AT,
    }),
  };

  await db
    .insert(emailSendJobs)
    .values({
      id: DEMO_CLIENT.reviewJobId,
      tenantId: TENANT_ID,
      triggerId: EMAIL_TRIGGER_IDS.wonReview,
      templateId: EMAIL_TEMPLATE_IDS.googleReview,
      contactId: DEMO_CLIENT.contactId,
      dealId: DEMO_CLIENT.dealId,
      policyId: DEMO_CLIENT.policyId,
      toEmail: "marcus.bell@example.com",
      locale: "en",
      subject: rendered.subject,
      body: rendered.body,
      sendFromProvider: "google",
      status: "queued",
      holdReason: EMAIL_JOB_HOLD,
      scheduledFor: REVIEW_AT,
      anchorKind: "won_date",
      anchorAt: WON_AT,
    })
    .onConflictDoNothing({ target: emailSendJobs.id });

  const existingHistory = await db
    .select({ id: clientHistory.id })
    .from(clientHistory)
    .where(
      and(
        eq(clientHistory.tenantId, TENANT_ID),
        eq(clientHistory.contactId, DEMO_CLIENT.contactId),
        eq(clientHistory.eventType, "email_queued"),
      ),
    );
  if (existingHistory.length === 0) {
    await db.insert(clientHistory).values({
      tenantId: TENANT_ID,
      contactId: DEMO_CLIENT.contactId,
      dealId: DEMO_CLIENT.dealId,
      policyId: DEMO_CLIENT.policyId,
      eventType: "email_queued",
      body: `Queued “${rendered.subject}” (Closed Won + 4 days · Google review) for 2026-09-03. Status: queued — connect email to send.`,
      occurredAt: REVIEW_AT,
    });
  }
}
