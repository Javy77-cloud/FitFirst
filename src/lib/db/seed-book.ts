import { eq } from "drizzle-orm";
import { hashPassword } from "../auth/password";
import { commissionAmount } from "../commissions/math";
import {
  ADMIN_USER_ID,
  AGENCY_SETTINGS_ID,
  AGENT_USER_ID,
  CARRIER_IDS,
  CONTACT_ID,
  DEAL_ID,
  DEMO_ASK_HALE,
  DEMO_ASK_SHAH,
  DEMO_COMMISSION,
  DEMO_CONTACT_BELL,
  DEMO_CONTACT_HALE,
  DEMO_CONTACT_REED,
  DEMO_CONTACT_SHAH,
  DEMO_POLICY_BELL_AUTO,
  DEMO_POLICY_BELL_FLOOD,
  DEMO_POLICY_HALE_HO,
  DEMO_POLICY_REED_AUTO,
  DEMO_POLICY_REED_FLOOD,
  DEMO_POLICY_SHAH_HO,
  LEAD_ID,
  TENANT_ID,
} from "../fixtures/ids";
import { db } from "./index";
import {
  agencySettings,
  commissions,
  contacts,
  deals,
  leads,
  policies,
  recordAsks,
  users,
} from "./schema";

type DemoCommission = {
  id: string;
  agentId: string;
  policyId: string;
  carrierId: string;
  line: string;
  premium: number;
  ratePct: number;
  status: "pending" | "payable" | "paid" | "held";
  dueDate: string | null;
  paidDate: string | null;
  period: string;
};

const BOOK: DemoCommission[] = [
  {
    id: DEMO_COMMISSION.haleHo,
    agentId: ADMIN_USER_ID,
    policyId: DEMO_POLICY_HALE_HO,
    carrierId: CARRIER_IDS.americanIntegrity,
    line: "HO",
    premium: 2184,
    ratePct: 12,
    status: "pending",
    dueDate: "2026-09-14T16:00:00.000Z",
    paidDate: null,
    period: "2026-09",
  },
  {
    id: DEMO_COMMISSION.bellAuto,
    agentId: ADMIN_USER_ID,
    policyId: DEMO_POLICY_BELL_AUTO,
    carrierId: CARRIER_IDS.qbe,
    line: "AUTO",
    premium: 1840,
    ratePct: 10,
    status: "paid",
    dueDate: "2026-08-20T16:00:00.000Z",
    paidDate: "2026-08-15T16:00:00.000Z",
    period: "2026-08",
  },
  {
    id: DEMO_COMMISSION.bellFlood,
    agentId: ADMIN_USER_ID,
    policyId: DEMO_POLICY_BELL_FLOOD,
    carrierId: CARRIER_IDS.sagesure,
    line: "FLOOD",
    premium: 640,
    ratePct: 15,
    status: "payable",
    dueDate: "2026-09-23T16:00:00.000Z",
    paidDate: null,
    period: "2026-09",
  },
  {
    id: DEMO_COMMISSION.javyQ2,
    agentId: ADMIN_USER_ID,
    policyId: DEMO_POLICY_BELL_AUTO,
    carrierId: CARRIER_IDS.qbe,
    line: "AUTO",
    premium: 1760,
    ratePct: 10,
    status: "paid",
    dueDate: "2026-05-30T16:00:00.000Z",
    paidDate: "2026-05-12T16:00:00.000Z",
    period: "2026-05",
  },
  {
    id: DEMO_COMMISSION.shahHo,
    agentId: AGENT_USER_ID,
    policyId: DEMO_POLICY_SHAH_HO,
    carrierId: CARRIER_IDS.tailrow,
    line: "HO",
    premium: 1960,
    ratePct: 11,
    status: "payable",
    dueDate: "2026-09-07T16:00:00.000Z",
    paidDate: null,
    period: "2026-09",
  },
  {
    id: DEMO_COMMISSION.reedAuto,
    agentId: AGENT_USER_ID,
    policyId: DEMO_POLICY_REED_AUTO,
    carrierId: CARRIER_IDS.benchmark,
    line: "AUTO",
    premium: 1420,
    ratePct: 10,
    status: "paid",
    dueDate: "2026-08-28T16:00:00.000Z",
    paidDate: "2026-08-23T16:00:00.000Z",
    period: "2026-08",
  },
  {
    id: DEMO_COMMISSION.reedFlood,
    agentId: AGENT_USER_ID,
    policyId: DEMO_POLICY_REED_FLOOD,
    carrierId: CARRIER_IDS.geovera,
    line: "FLOOD",
    premium: 890,
    ratePct: 8,
    status: "held",
    dueDate: "2026-10-01T16:00:00.000Z",
    paidDate: null,
    period: "2026-09",
  },
];

export async function seedUsersAndBook() {
  const password = process.env.DEV_ADMIN_PASSWORD || "fitfirst-local";
  const adminHash = hashPassword(password);

  await db
    .insert(users)
    .values({
      id: ADMIN_USER_ID,
      tenantId: TENANT_ID,
      name: "Javy Rivera",
      email: "javy@fitfirst.local",
      role: "admin",
      passwordHash: adminHash,
      active: true,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        name: "Javy Rivera",
        email: "javy@fitfirst.local",
        role: "admin",
        passwordHash: adminHash,
        active: true,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(users)
    .values({
      id: AGENT_USER_ID,
      tenantId: TENANT_ID,
      name: "Maya Chen",
      email: "maya@fitfirst.local",
      role: "agent",
      passwordHash: null,
      active: true,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        name: "Maya Chen",
        email: "maya@fitfirst.local",
        role: "agent",
        active: true,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(agencySettings)
    .values({
      id: AGENCY_SETTINGS_ID,
      tenantId: TENANT_ID,
      fiscalYearStartMonth: 1,
    })
    .onConflictDoUpdate({
      target: agencySettings.id,
      set: { fiscalYearStartMonth: 1, updatedAt: new Date() },
    });

  await db.update(leads).set({ ownerId: ADMIN_USER_ID, updatedAt: new Date() }).where(eq(leads.id, LEAD_ID));
  await db
    .update(contacts)
    .set({ ownerId: ADMIN_USER_ID, updatedAt: new Date() })
    .where(eq(contacts.id, CONTACT_ID));
  await db.update(deals).set({ ownerId: ADMIN_USER_ID, updatedAt: new Date() }).where(eq(deals.id, DEAL_ID));

  const bookContacts = [
    {
      id: DEMO_CONTACT_HALE,
      firstName: "Robert",
      lastName: "Hale",
      city: "Melbourne",
      ownerId: ADMIN_USER_ID,
      policyCount: 1,
      notes: "Bound HO3 on the book. Not the Ana Dib shop.",
    },
    {
      id: DEMO_CONTACT_BELL,
      firstName: "Marcus",
      lastName: "Bell",
      city: "Titusville",
      ownerId: ADMIN_USER_ID,
      policyCount: 2,
      notes: "Auto + flood. Demo producer-pay book for Javy.",
    },
    {
      id: DEMO_CONTACT_SHAH,
      firstName: "Priya",
      lastName: "Shah",
      city: "Orlando",
      ownerId: AGENT_USER_ID,
      policyCount: 1,
      notes: "Maya Chen producer. Bound HO — not a quote floor.",
    },
    {
      id: DEMO_CONTACT_REED,
      firstName: "Tomas",
      lastName: "Reed",
      city: "Cocoa",
      ownerId: AGENT_USER_ID,
      policyCount: 2,
      notes: "Maya Chen producer. Auto paid, flood held.",
    },
  ] as const;

  for (const contact of bookContacts) {
    await db
      .insert(contacts)
      .values({
        id: contact.id,
        tenantId: TENANT_ID,
        firstName: contact.firstName,
        lastName: contact.lastName,
        city: contact.city,
        state: "FL",
        tenureStart: new Date("2026-03-01T16:00:00.000Z"),
        policyCount: contact.policyCount,
        notes: contact.notes,
        ownerId: contact.ownerId,
      })
      .onConflictDoUpdate({
        target: contacts.id,
        set: {
          firstName: contact.firstName,
          lastName: contact.lastName,
          city: contact.city,
          policyCount: contact.policyCount,
          notes: contact.notes,
          ownerId: contact.ownerId,
          updatedAt: new Date(),
        },
      });
  }

  const bookPolicies = [
    {
      id: DEMO_POLICY_HALE_HO,
      contactId: DEMO_CONTACT_HALE,
      ownerId: ADMIN_USER_ID,
      carrierId: CARRIER_IDS.americanIntegrity,
      number: "AI-FL-88421",
      line: "HO",
      premium: "2184.00",
      effective: "2026-08-15T16:00:00.000Z",
      expiration: "2027-08-15T16:00:00.000Z",
    },
    {
      id: DEMO_POLICY_BELL_AUTO,
      contactId: DEMO_CONTACT_BELL,
      ownerId: ADMIN_USER_ID,
      carrierId: CARRIER_IDS.qbe,
      number: "QBE-AU-11904",
      line: "AUTO",
      premium: "1840.00",
      effective: "2026-07-01T16:00:00.000Z",
      expiration: "2027-07-01T16:00:00.000Z",
    },
    {
      id: DEMO_POLICY_BELL_FLOOD,
      contactId: DEMO_CONTACT_BELL,
      ownerId: ADMIN_USER_ID,
      carrierId: CARRIER_IDS.sagesure,
      number: "SS-FL-33018",
      line: "FLOOD",
      premium: "640.00",
      effective: "2026-08-20T16:00:00.000Z",
      expiration: "2027-08-20T16:00:00.000Z",
    },
    {
      id: DEMO_POLICY_SHAH_HO,
      contactId: DEMO_CONTACT_SHAH,
      ownerId: AGENT_USER_ID,
      carrierId: CARRIER_IDS.tailrow,
      number: "TR-HO-55210",
      line: "HO",
      premium: "1960.00",
      effective: "2026-08-01T16:00:00.000Z",
      expiration: "2027-08-01T16:00:00.000Z",
    },
    {
      id: DEMO_POLICY_REED_AUTO,
      contactId: DEMO_CONTACT_REED,
      ownerId: AGENT_USER_ID,
      carrierId: CARRIER_IDS.benchmark,
      number: "BM-AU-77431",
      line: "AUTO",
      premium: "1420.00",
      effective: "2026-07-15T16:00:00.000Z",
      expiration: "2027-07-15T16:00:00.000Z",
    },
    {
      id: DEMO_POLICY_REED_FLOOD,
      contactId: DEMO_CONTACT_REED,
      ownerId: AGENT_USER_ID,
      carrierId: CARRIER_IDS.geovera,
      number: "GV-FL-90112",
      line: "FLOOD",
      premium: "890.00",
      effective: "2026-09-01T16:00:00.000Z",
      expiration: "2027-09-01T16:00:00.000Z",
    },
  ] as const;

  for (const policy of bookPolicies) {
    await db
      .insert(policies)
      .values({
        id: policy.id,
        tenantId: TENANT_ID,
        contactId: policy.contactId,
        carrierId: policy.carrierId,
        policyNumber: policy.number,
        lineOfBusiness: policy.line,
        status: "active",
        effectiveDate: new Date(policy.effective),
        expirationDate: new Date(policy.expiration),
        premium: policy.premium,
        ownerId: policy.ownerId,
      })
      .onConflictDoUpdate({
        target: policies.id,
        set: {
          contactId: policy.contactId,
          carrierId: policy.carrierId,
          policyNumber: policy.number,
          lineOfBusiness: policy.line,
          premium: policy.premium,
          ownerId: policy.ownerId,
          updatedAt: new Date(),
        },
      });
  }

  for (const row of BOOK) {
    const amount = commissionAmount(row.premium, row.ratePct).toFixed(2);
    await db
      .insert(commissions)
      .values({
        id: row.id,
        tenantId: TENANT_ID,
        agentId: row.agentId,
        policyId: row.policyId,
        carrierId: row.carrierId,
        lineOfBusiness: row.line,
        premium: row.premium.toFixed(2),
        ratePct: row.ratePct.toFixed(2),
        amount,
        status: row.status,
        dueDate: row.dueDate ? new Date(row.dueDate) : null,
        paidDate: row.paidDate ? new Date(row.paidDate) : null,
        period: row.period,
      })
      .onConflictDoUpdate({
        target: commissions.id,
        set: {
          agentId: row.agentId,
          policyId: row.policyId,
          carrierId: row.carrierId,
          lineOfBusiness: row.line,
          premium: row.premium.toFixed(2),
          ratePct: row.ratePct.toFixed(2),
          amount,
          status: row.status,
          dueDate: row.dueDate ? new Date(row.dueDate) : null,
          paidDate: row.paidDate ? new Date(row.paidDate) : null,
          period: row.period,
          updatedAt: new Date(),
        },
      });
  }

  await db
    .insert(recordAsks)
    .values({
      id: DEMO_ASK_SHAH,
      tenantId: TENANT_ID,
      entityType: "commission",
      entityId: DEMO_COMMISSION.shahHo,
      authorId: AGENT_USER_ID,
      kind: "payout",
      body: "Request payout — this one cleared last week. Can we move it to paid?",
      status: "open",
    })
    .onConflictDoUpdate({
      target: recordAsks.id,
      set: {
        body: "Request payout — this one cleared last week. Can we move it to paid?",
        kind: "payout",
        status: "open",
        resolvedBy: null,
        resolvedAt: null,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(recordAsks)
    .values({
      id: DEMO_ASK_HALE,
      tenantId: TENANT_ID,
      entityType: "commission",
      entityId: DEMO_COMMISSION.haleHo,
      authorId: ADMIN_USER_ID,
      kind: "question",
      body: "What about this? AI still has not issued the producer statement.",
      status: "open",
    })
    .onConflictDoUpdate({
      target: recordAsks.id,
      set: {
        body: "What about this? AI still has not issued the producer statement.",
        kind: "question",
        status: "open",
        updatedAt: new Date(),
      },
    });
}
