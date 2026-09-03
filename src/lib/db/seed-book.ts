import { eq } from "drizzle-orm";
import { hashPassword } from "../auth/password";
import { splitCommission } from "../commissions/math";
import {
  ADMIN_USER_ID,
  AGENCY_SETTINGS_ID,
  AGENT_USER_ID,
  CARRIER_GOAL_IDS,
  CARRIER_IDS,
  CONTACT_ID,
  DEAL_ID,
  DEMO_ASK_HALE,
  DEMO_ASK_SHAH,
  DEMO_COMMISSION,
  DEMO_CONTACT_BELL,
  DEMO_CONTACT_HALE,
  DEMO_CONTACT_HARBOR_KEY,
  DEMO_CONTACT_REED,
  DEMO_CONTACT_SHAH,
  DEMO_POLICY_BELL_AUTO,
  DEMO_POLICY_BELL_FLOOD,
  DEMO_POLICY_HALE_HO,
  DEMO_POLICY_HARBOR_BOP,
  DEMO_POLICY_HARBOR_GL,
  DEMO_POLICY_REED_AUTO,
  DEMO_POLICY_REED_FLOOD,
  DEMO_POLICY_SHAH_HO,
  EARNINGS_COMMISSION,
  EARNINGS_EVENT,
  LEAD_ID,
  OPP_CONTACT_IDS,
  OPP_POLICY_IDS,
  TENANT_ID,
} from "../fixtures/ids";
import { db } from "./index";
import { seedZohoPolicyCommissions } from "./seed-zoho-commissions";
import {
  agencySettings,
  carrierGoals,
  commissionEvents,
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
  producerSplitPct?: number;
  sellingAgency?: "afa" | "first_connect" | "agentero";
  status: "pending" | "payable" | "paid" | "held";
  dueDate: string | null;
  paidDate: string | null;
  paidByUserId?: string | null;
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
  {
    id: EARNINGS_COMMISSION.ruizHo,
    agentId: AGENT_USER_ID,
    policyId: OPP_POLICY_IDS.ruizHo,
    carrierId: CARRIER_IDS.americanIntegrity,
    line: "HO",
    premium: 3340,
    ratePct: 12,
    producerSplitPct: 60,
    sellingAgency: "afa",
    status: "pending",
    dueDate: "2026-09-18T16:00:00.000Z",
    paidDate: null,
    period: "2026-09",
  },
  {
    id: EARNINGS_COMMISSION.ruizAuto,
    agentId: AGENT_USER_ID,
    policyId: OPP_POLICY_IDS.ruizAuto,
    carrierId: CARRIER_IDS.qbe,
    line: "AUTO",
    premium: 1910,
    ratePct: 10,
    producerSplitPct: 50,
    sellingAgency: "first_connect",
    status: "paid",
    dueDate: "2026-08-12T16:00:00.000Z",
    paidDate: "2026-08-10T16:00:00.000Z",
    paidByUserId: ADMIN_USER_ID,
    period: "2026-08",
  },
  {
    id: EARNINGS_COMMISSION.harborGl,
    agentId: ADMIN_USER_ID,
    policyId: DEMO_POLICY_HARBOR_GL,
    carrierId: CARRIER_IDS.qbe,
    line: "GL",
    premium: 4820,
    ratePct: 12,
    producerSplitPct: 55,
    sellingAgency: "agentero",
    status: "pending",
    dueDate: "2026-09-28T16:00:00.000Z",
    paidDate: null,
    period: "2026-09",
  },
  {
    id: EARNINGS_COMMISSION.harborBop,
    agentId: ADMIN_USER_ID,
    policyId: DEMO_POLICY_HARBOR_BOP,
    carrierId: CARRIER_IDS.sagesure,
    line: "BOP",
    premium: 2760,
    ratePct: 15,
    producerSplitPct: 50,
    sellingAgency: "afa",
    status: "paid",
    dueDate: "2026-07-22T16:00:00.000Z",
    paidDate: "2026-07-18T16:00:00.000Z",
    paidByUserId: ADMIN_USER_ID,
    period: "2026-07",
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
    {
      id: OPP_CONTACT_IDS.ruiz,
      firstName: "Camila",
      lastName: "Ruiz",
      city: "Melbourne",
      ownerId: AGENT_USER_ID,
      policyCount: 2,
      notes: "HO + personal auto on Maya's book. Not the Ana Dib shop — Ana has no commission.",
    },
    {
      id: DEMO_CONTACT_HARBOR_KEY,
      firstName: "Harbor Key",
      lastName: "Marine",
      city: "Titusville",
      ownerId: ADMIN_USER_ID,
      policyCount: 2,
      notes: "Commercial marina. GL pending, BOP paid. Producer pay only — no insured premium collection.",
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
    {
      id: OPP_POLICY_IDS.ruizHo,
      contactId: OPP_CONTACT_IDS.ruiz,
      ownerId: AGENT_USER_ID,
      carrierId: CARRIER_IDS.americanIntegrity,
      number: "AI-HO-66102",
      line: "HO",
      premium: "3340.00",
      effective: "2026-08-08T16:00:00.000Z",
      expiration: "2027-08-08T16:00:00.000Z",
    },
    {
      id: OPP_POLICY_IDS.ruizAuto,
      contactId: OPP_CONTACT_IDS.ruiz,
      ownerId: AGENT_USER_ID,
      carrierId: CARRIER_IDS.qbe,
      number: "QBE-PA-66103",
      line: "AUTO",
      premium: "1910.00",
      effective: "2026-07-12T16:00:00.000Z",
      expiration: "2027-07-12T16:00:00.000Z",
    },
    {
      id: DEMO_POLICY_HARBOR_GL,
      contactId: DEMO_CONTACT_HARBOR_KEY,
      ownerId: ADMIN_USER_ID,
      carrierId: CARRIER_IDS.qbe,
      number: "QBE-GL-44021",
      line: "GL",
      premium: "4820.00",
      effective: "2026-08-25T16:00:00.000Z",
      expiration: "2027-08-25T16:00:00.000Z",
    },
    {
      id: DEMO_POLICY_HARBOR_BOP,
      contactId: DEMO_CONTACT_HARBOR_KEY,
      ownerId: ADMIN_USER_ID,
      carrierId: CARRIER_IDS.sagesure,
      number: "SS-BOP-44022",
      line: "BOP",
      premium: "2760.00",
      effective: "2026-06-20T16:00:00.000Z",
      expiration: "2027-06-20T16:00:00.000Z",
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
    const split = splitCommission(row.premium, row.ratePct, row.producerSplitPct ?? 100);
    const amount = split.producerAmount.toFixed(2);
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
        agencyAmount: split.agencyAmount.toFixed(2),
        producerAmount: split.producerAmount.toFixed(2),
        sellingAgency: row.sellingAgency ?? "afa",
        status: row.status,
        dueDate: row.dueDate ? new Date(row.dueDate) : null,
        paidDate: row.paidDate ? new Date(row.paidDate) : null,
        paidByUserId: row.status === "paid" ? (row.paidByUserId ?? ADMIN_USER_ID) : null,
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
          agencyAmount: split.agencyAmount.toFixed(2),
          producerAmount: split.producerAmount.toFixed(2),
          sellingAgency: row.sellingAgency ?? "afa",
          status: row.status,
          dueDate: row.dueDate ? new Date(row.dueDate) : null,
          paidDate: row.paidDate ? new Date(row.paidDate) : null,
          paidByUserId: row.status === "paid" ? (row.paidByUserId ?? ADMIN_USER_ID) : null,
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

  const paidEvents = [
    {
      id: EARNINGS_EVENT.ruizAuto,
      commissionId: EARNINGS_COMMISSION.ruizAuto,
      fromStatus: "pending",
      toStatus: "paid",
      note: "Marked paid — Ruiz auto. Policy stays in force.",
      createdAt: new Date("2026-08-10T16:00:00.000Z"),
    },
    {
      id: EARNINGS_EVENT.harborBop,
      commissionId: EARNINGS_COMMISSION.harborBop,
      fromStatus: "pending",
      toStatus: "paid",
      note: "Marked paid — Harbor Key BOP. Policy status unchanged.",
      createdAt: new Date("2026-07-18T16:00:00.000Z"),
    },
    {
      id: EARNINGS_EVENT.reedAuto,
      commissionId: DEMO_COMMISSION.reedAuto,
      fromStatus: "pending",
      toStatus: "paid",
      note: "Marked paid — Reed auto.",
      createdAt: new Date("2026-08-23T16:00:00.000Z"),
    },
    {
      id: EARNINGS_EVENT.bellAuto,
      commissionId: DEMO_COMMISSION.bellAuto,
      fromStatus: "pending",
      toStatus: "paid",
      note: "Marked paid — Bell auto.",
      createdAt: new Date("2026-08-15T16:00:00.000Z"),
    },
    {
      id: EARNINGS_EVENT.javyQ2,
      commissionId: DEMO_COMMISSION.javyQ2,
      fromStatus: "pending",
      toStatus: "paid",
      note: "Marked paid — Q2 auto statement.",
      createdAt: new Date("2026-05-12T16:00:00.000Z"),
    },
  ];

  for (const event of paidEvents) {
    await db
      .insert(commissionEvents)
      .values({
        id: event.id,
        tenantId: TENANT_ID,
        commissionId: event.commissionId,
        actorId: ADMIN_USER_ID,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        note: event.note,
        createdAt: event.createdAt,
      })
      .onConflictDoUpdate({
        target: commissionEvents.id,
        set: {
          note: event.note,
          fromStatus: event.fromStatus,
          toStatus: event.toStatus,
        },
      });
  }

  const goals = [
    {
      id: CARRIER_GOAL_IDS.americanIntegrity2026,
      carrierId: CARRIER_IDS.americanIntegrity,
      year: 2026,
      premiumGoal: "8000.00",
      policyGoal: 4,
    },
    {
      id: CARRIER_GOAL_IDS.geovera2026,
      carrierId: CARRIER_IDS.geovera,
      year: 2026,
      premiumGoal: "4000.00",
      policyGoal: 1,
    },
    {
      id: CARRIER_GOAL_IDS.tailrow2026,
      carrierId: CARRIER_IDS.tailrow,
      year: 2026,
      premiumGoal: "3000.00",
      policyGoal: 2,
    },
  ];

  for (const row of goals) {
    await db
      .insert(carrierGoals)
      .values({
        id: row.id,
        tenantId: TENANT_ID,
        carrierId: row.carrierId,
        year: row.year,
        premiumGoal: row.premiumGoal,
        policyGoal: row.policyGoal,
      })
      .onConflictDoUpdate({
        target: carrierGoals.id,
        set: {
          premiumGoal: row.premiumGoal,
          policyGoal: row.policyGoal,
          updatedAt: new Date(),
        },
      });
  }

  await seedZohoPolicyCommissions();
}
