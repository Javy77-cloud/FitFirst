import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "./index";
import { agencySettings, contests, contacts, leadOfferClaims, leadOffers, policies, users } from "./schema";
import {
  ADMIN_USER_ID,
  AGENCY_SETTINGS_ID,
  CONTACT_ID,
  DEMO_CONTACT_BELL,
  DEMO_CONTACT_HALE,
  DEMO_CONTACT_REED,
  DEMO_CONTACT_SHAH,
  AGENT_USER_ID,
  HOME_AGENT_IDS,
  LEAD_OFFER_CLAIM_IDS,
  LEAD_OFFER_IDS,
  NAIR_CONTACT_ID,
  Q3_PREMIUM_CONTEST_ID,
  TENANT_ID,
} from "../fixtures/ids";

/** Existing contacts only — no new people. DOBs feed birthday + turning-65 widgets. */
const DOB_UPDATES: { id: string; dateOfBirth: string }[] = [
  { id: DEMO_CONTACT_HALE, dateOfBirth: "1968-09-03" },
  { id: DEMO_CONTACT_BELL, dateOfBirth: "1974-09-09" },
  { id: DEMO_CONTACT_SHAH, dateOfBirth: "1988-10-12" },
  { id: DEMO_CONTACT_REED, dateOfBirth: "1961-10-22" },
  { id: NAIR_CONTACT_ID, dateOfBirth: "1962-03-15" },
];

export async function seedHomeDashboard() {
  await db
    .insert(users)
    .values([
      {
        id: HOME_AGENT_IDS.luis,
        tenantId: TENANT_ID,
        name: "Luis Mena",
        email: "luis@fitfirst.local",
        role: "agent",
        active: true,
        meetingAddress: "Suite 114 · producer desk",
      },
      {
        id: HOME_AGENT_IDS.ken,
        tenantId: TENANT_ID,
        name: "Ken Walsh",
        email: "ken@fitfirst.local",
        role: "agent",
        active: true,
        meetingAddress: "Suite 116 · producer desk",
      },
    ])
    .onConflictDoUpdate({
      target: users.id,
      set: {
        name: sql`excluded.name`,
        email: sql`excluded.email`,
        role: "agent",
        active: true,
        updatedAt: new Date(),
      },
    });

  await db
    .update(agencySettings)
    .set({ showCompanyWidgets: true, updatedAt: new Date() })
    .where(eq(agencySettings.id, AGENCY_SETTINGS_ID));

  for (const row of DOB_UPDATES) {
    await db
      .update(contacts)
      .set({ dateOfBirth: row.dateOfBirth, updatedAt: new Date() })
      .where(and(eq(contacts.tenantId, TENANT_ID), eq(contacts.id, row.id), ne(contacts.id, CONTACT_ID)));
  }

  const unowned = await db
    .select({ id: policies.id })
    .from(policies)
    .where(and(eq(policies.tenantId, TENANT_ID), isNull(policies.ownerId)))
    .limit(24);

  for (const [index, row] of unowned.entries()) {
    const ownerId = index % 2 === 0 ? HOME_AGENT_IDS.luis : HOME_AGENT_IDS.ken;
    await db
      .update(policies)
      .set({ ownerId, updatedAt: new Date() })
      .where(eq(policies.id, row.id));
  }

  const cancelled = await db
    .select({ id: policies.id, status: policies.status })
    .from(policies)
    .where(
      and(
        eq(policies.tenantId, TENANT_ID),
        inArray(policies.status, ["lapsed", "lapse", "expired", "cancelled"]),
        ne(policies.contactId, CONTACT_ID),
      ),
    )
    .limit(1);
  if (cancelled[0]) {
    await db
      .update(policies)
      .set({
        status: "cancelled",
        endedAt: new Date("2026-09-02T16:00:00.000Z"),
        endReason: "non_pay",
        updatedAt: new Date(),
      })
      .where(eq(policies.id, cancelled[0].id));
  }

  await db
    .insert(contests)
    .values({
      id: Q3_PREMIUM_CONTEST_ID,
      tenantId: TENANT_ID,
      title: "Q3 written-premium sprint",
      rules:
        "Highest in-force writings (effective date in the window) wins. Quotes do not count. Ana Dib's $321k HO3 stays unbound and off the board. Winner picks lunch.",
      metric: "premium",
      startsAt: new Date("2026-07-01T00:00:00.000Z"),
      endsAt: new Date("2026-09-30T23:59:59.000Z"),
      createdBy: ADMIN_USER_ID,
      active: true,
    })
    .onConflictDoUpdate({
      target: contests.id,
      set: {
        title: "Q3 written-premium sprint",
        rules:
          "Highest in-force writings (effective date in the window) wins. Quotes do not count. Ana Dib's $321k HO3 stays unbound and off the board. Winner picks lunch.",
        metric: "premium",
        startsAt: new Date("2026-07-01T00:00:00.000Z"),
        endsAt: new Date("2026-09-30T23:59:59.000Z"),
        createdBy: ADMIN_USER_ID,
        active: true,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(leadOffers)
    .values([
      {
        id: LEAD_OFFER_IDS.french,
        tenantId: TENANT_ID,
        title: "French-speaking HO shop",
        details:
          "I have a lead that speaks French — anyone want it? Palm Bay referral. Do not create a second Ana. Shop only.",
        language: "French",
        state: "FL",
        postedBy: ADMIN_USER_ID,
        status: "open",
      },
      {
        id: LEAD_OFFER_IDS.montana,
        tenantId: TENANT_ID,
        title: "Montana auto — licensed producers only",
        details: "Lead in Montana — anyone licensed in Montana? Nonresident OK if appointed. First claim is not an award.",
        language: null,
        state: "MT",
        postedBy: ADMIN_USER_ID,
        status: "open",
      },
    ])
    .onConflictDoUpdate({
      target: leadOffers.id,
      set: {
        title: sql`excluded.title`,
        details: sql`excluded.details`,
        language: sql`excluded.language`,
        state: sql`excluded.state`,
        status: "open",
        awardedTo: null,
        awardedAt: null,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(leadOfferClaims)
    .values([
      {
        id: LEAD_OFFER_CLAIM_IDS.frenchMaya,
        tenantId: TENANT_ID,
        offerId: LEAD_OFFER_IDS.french,
        agentId: AGENT_USER_ID,
        note: "I can take the French call this afternoon.",
      },
      {
        id: LEAD_OFFER_CLAIM_IDS.montanaKen,
        tenantId: TENANT_ID,
        offerId: LEAD_OFFER_IDS.montana,
        agentId: HOME_AGENT_IDS.ken,
        note: "Nonresident MT license is current.",
      },
    ])
    .onConflictDoUpdate({
      target: leadOfferClaims.id,
      set: { note: sql`excluded.note` },
    });
}
