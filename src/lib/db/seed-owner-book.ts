import { eq } from "drizzle-orm";
import { db } from "./index";
import { contacts, deals, leads, policies, reviewTasks } from "./schema";
import {
  CARRIER_IDS,
  CONTACT_ID,
  OWNER_CONTACT_IDS,
  OWNER_DEAL_IDS,
  OWNER_LEAD_IDS,
  OWNER_POLICY_IDS,
  OWNER_TASK_IDS,
  TENANT_ID,
} from "../fixtures/ids";

/**
 * In-force book + pipeline used by Home. Separate from the Ana HO3 shop:
 * that shop still creates no policy and is not written premium.
 */
export async function seedOwnerBook() {
  const bookContacts: (typeof contacts.$inferInsert)[] = [
    {
      id: OWNER_CONTACT_IDS.ruiz,
      tenantId: TENANT_ID,
      firstName: "Camila",
      lastName: "Ruiz",
      email: "camila.ruiz@example.com",
      phone: "321-555-0266",
      mailingAddress: "880 Croton Rd",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
      tenureStart: new Date("2022-05-09T16:00:00.000Z"),
      policyCount: 2,
      notes: "HO + personal auto. Flood is still an open gap. Not the Ana shop.",
    },
    {
      id: OWNER_CONTACT_IDS.patel,
      tenantId: TENANT_ID,
      firstName: "Nia",
      lastName: "Patel",
      email: "nia.patel@example.com",
      phone: "321-555-0244",
      mailingAddress: "1902 S Harbor City Blvd",
      city: "Melbourne",
      state: "FL",
      zip: "32901",
      tenureStart: new Date("2025-08-10T16:00:00.000Z"),
      policyCount: 1,
      notes: "NFIP flood only. Written last month.",
    },
    {
      id: OWNER_CONTACT_IDS.grant,
      tenantId: TENANT_ID,
      firstName: "Owen",
      lastName: "Grant",
      email: "owen.grant@example.com",
      phone: "321-555-0233",
      mailingAddress: "44 Ocean Spray Ln",
      city: "Satellite Beach",
      state: "FL",
      zip: "32937",
      tenureStart: new Date("2025-11-03T16:00:00.000Z"),
      policyCount: 1,
      notes: "HO3 renews inside 60 days.",
    },
    {
      id: OWNER_CONTACT_IDS.harborKey,
      tenantId: TENANT_ID,
      firstName: "Harbor Key",
      lastName: "Holdings",
      email: "ops@harborkey.example",
      phone: "321-555-0400",
      mailingAddress: "12 Max Brewer Bridge Approach",
      city: "Titusville",
      state: "FL",
      zip: "32796",
      tenureStart: new Date("2026-09-01T16:00:00.000Z"),
      policyCount: 1,
      notes: "Commercial marina GL. Bound and issued this month.",
    },
    {
      id: OWNER_CONTACT_IDS.pike,
      tenantId: TENANT_ID,
      firstName: "Jonah",
      lastName: "Pike",
      email: "jonah.pike@example.com",
      phone: "321-555-0311",
      mailingAddress: "255 Barton Blvd",
      city: "Rockledge",
      state: "FL",
      zip: "32955",
      tenureStart: new Date("2025-09-28T16:00:00.000Z"),
      policyCount: 1,
      notes: "Personal auto renews inside 30 days.",
    },
    {
      id: OWNER_CONTACT_IDS.soto,
      tenantId: TENANT_ID,
      firstName: "Ivy",
      lastName: "Soto",
      email: "ivy.soto@example.com",
      phone: "321-555-0322",
      mailingAddress: "71 Dairy Rd",
      city: "West Melbourne",
      state: "FL",
      zip: "32904",
      tenureStart: new Date("2024-04-01T16:00:00.000Z"),
      policyCount: 0,
      notes: "HO lapsed. Not in-force premium.",
    },
    {
      id: OWNER_CONTACT_IDS.nguyen,
      tenantId: TENANT_ID,
      firstName: "Maya",
      lastName: "Nguyen",
      email: "maya.nguyen@example.com",
      phone: "321-555-0333",
      mailingAddress: "18 Wave Crest Ave",
      city: "Indialantic",
      state: "FL",
      zip: "32903",
      policyCount: 0,
      notes: "Auto quote sent. Not bound.",
    },
    {
      id: OWNER_CONTACT_IDS.reyes,
      tenantId: TENANT_ID,
      firstName: "Elena",
      lastName: "Reyes",
      email: "elena.reyes@example.com",
      phone: "321-555-0344",
      mailingAddress: "6 Riveredge Ct",
      city: "Cocoa",
      state: "FL",
      zip: "32922",
      policyCount: 0,
      notes: "HO3 bound this month. Carrier has not issued the policy number yet.",
    },
  ];

  for (const row of bookContacts) {
    await db
      .insert(contacts)
      .values(row)
      .onConflictDoUpdate({
        target: contacts.id,
        set: {
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          mailingAddress: row.mailingAddress,
          city: row.city,
          state: row.state,
          zip: row.zip,
          tenureStart: row.tenureStart ?? null,
          policyCount: row.policyCount,
          notes: row.notes,
          updatedAt: new Date(),
        },
      });
  }

  const bookLeads: (typeof leads.$inferInsert)[] = [
    {
      id: OWNER_LEAD_IDS.harbor,
      tenantId: TENANT_ID,
      firstName: "Harbor Key",
      lastName: "Holdings",
      source: "book",
      status: "converted",
      convertedDealId: OWNER_DEAL_IDS.harbor,
      notes: "Commercial GL won September 2026.",
    },
    {
      id: OWNER_LEAD_IDS.nguyen,
      tenantId: TENANT_ID,
      firstName: "Maya",
      lastName: "Nguyen",
      source: "referral",
      status: "converted",
      convertedDealId: OWNER_DEAL_IDS.nguyen,
      notes: "Quote sent. Not bound.",
    },
    {
      id: OWNER_LEAD_IDS.reyes,
      tenantId: TENANT_ID,
      firstName: "Elena",
      lastName: "Reyes",
      source: "book",
      status: "converted",
      convertedDealId: OWNER_DEAL_IDS.reyes,
      notes: "Bound, waiting on issue.",
    },
  ];

  for (const row of bookLeads) {
    await db
      .insert(leads)
      .values(row)
      .onConflictDoUpdate({
        target: leads.id,
        set: {
          firstName: row.firstName,
          lastName: row.lastName,
          source: row.source,
          status: row.status,
          convertedDealId: row.convertedDealId,
          notes: row.notes,
          updatedAt: new Date(),
        },
      });
  }

  const bookDeals: (typeof deals.$inferInsert)[] = [
    {
      id: OWNER_DEAL_IDS.harbor,
      tenantId: TENANT_ID,
      leadId: OWNER_LEAD_IDS.harbor,
      contactId: OWNER_CONTACT_IDS.harborKey,
      title: "Harbor Key Holdings · marina GL",
      pipelineStage: "bound",
      lineOfBusiness: "GL",
      state: "FL",
      boundAt: new Date("2026-09-01T16:00:00.000Z"),
      notes: "Closed won this month. Policy HK-GL-22019 is in force.",
    },
    {
      id: OWNER_DEAL_IDS.nguyen,
      tenantId: TENANT_ID,
      leadId: OWNER_LEAD_IDS.nguyen,
      contactId: OWNER_CONTACT_IDS.nguyen,
      title: "Nguyen · personal auto",
      pipelineStage: "quote_sent",
      lineOfBusiness: "AUTO",
      state: "FL",
      notes: "Quote sent. Not coverage.",
    },
    {
      id: OWNER_DEAL_IDS.reyes,
      tenantId: TENANT_ID,
      leadId: OWNER_LEAD_IDS.reyes,
      contactId: OWNER_CONTACT_IDS.reyes,
      title: "Reyes · Cocoa HO3",
      pipelineStage: "bound",
      lineOfBusiness: "HO",
      state: "FL",
      boundAt: new Date("2026-09-02T18:00:00.000Z"),
      notes: "Bound 2026-09-02. Waiting on the carrier to issue. No policy row.",
    },
  ];

  for (const row of bookDeals) {
    await db
      .insert(deals)
      .values(row)
      .onConflictDoUpdate({
        target: deals.id,
        set: {
          leadId: row.leadId,
          contactId: row.contactId,
          title: row.title,
          pipelineStage: row.pipelineStage,
          lineOfBusiness: row.lineOfBusiness,
          state: row.state,
          boundAt: row.boundAt ?? null,
          notes: row.notes,
          updatedAt: new Date(),
        },
      });
  }

  const bookPolicies: (typeof policies.$inferInsert)[] = [
    {
      id: OWNER_POLICY_IDS.ruizHo,
      tenantId: TENANT_ID,
      contactId: OWNER_CONTACT_IDS.ruiz,
      carrierId: CARRIER_IDS.americanIntegrity,
      policyNumber: "AI-HO-66102",
      lineOfBusiness: "HO",
      status: "active",
      effectiveDate: new Date("2025-09-15T00:00:00.000Z"),
      expirationDate: new Date("2026-09-15T00:00:00.000Z"),
      premium: "3340.00",
      coverageA: 402000,
    },
    {
      id: OWNER_POLICY_IDS.ruizAuto,
      tenantId: TENANT_ID,
      contactId: OWNER_CONTACT_IDS.ruiz,
      carrierId: CARRIER_IDS.qbe,
      policyNumber: "QBE-PA-66103",
      lineOfBusiness: "AUTO",
      status: "active",
      effectiveDate: new Date("2026-05-06T00:00:00.000Z"),
      expirationDate: new Date("2027-01-01T00:00:00.000Z"),
      premium: "1910.00",
    },
    {
      id: OWNER_POLICY_IDS.patelFlood,
      tenantId: TENANT_ID,
      contactId: OWNER_CONTACT_IDS.patel,
      carrierId: CARRIER_IDS.sagesure,
      policyNumber: "SS-FL-11820",
      lineOfBusiness: "FLOOD",
      status: "active",
      effectiveDate: new Date("2026-08-10T00:00:00.000Z"),
      expirationDate: new Date("2027-08-10T00:00:00.000Z"),
      premium: "712.00",
    },
    {
      id: OWNER_POLICY_IDS.dibHoPrior,
      tenantId: TENANT_ID,
      contactId: CONTACT_ID,
      carrierId: CARRIER_IDS.geovera,
      policyNumber: "FF-BK-HO-1044",
      lineOfBusiness: "HO",
      status: "active",
      effectiveDate: new Date("2025-10-01T16:00:00.000Z"),
      expirationDate: new Date("2027-04-01T16:00:00.000Z"),
      premium: "2890.00",
      coverageA: 321000,
    },
    {
      id: OWNER_POLICY_IDS.grantHo,
      tenantId: TENANT_ID,
      contactId: OWNER_CONTACT_IDS.grant,
      carrierId: CARRIER_IDS.geovera,
      policyNumber: "GV-HO-77240",
      lineOfBusiness: "HO",
      status: "active",
      effectiveDate: new Date("2025-11-02T00:00:00.000Z"),
      expirationDate: new Date("2026-11-02T00:00:00.000Z"),
      premium: "3015.00",
      coverageA: 289000,
    },
    {
      id: OWNER_POLICY_IDS.harborGl,
      tenantId: TENANT_ID,
      contactId: OWNER_CONTACT_IDS.harborKey,
      dealId: OWNER_DEAL_IDS.harbor,
      carrierId: CARRIER_IDS.tailrow,
      policyNumber: "TR-GL-22019",
      lineOfBusiness: "GL",
      status: "bound",
      effectiveDate: new Date("2026-09-01T00:00:00.000Z"),
      expirationDate: new Date("2027-09-01T00:00:00.000Z"),
      premium: "8640.00",
    },
    {
      id: OWNER_POLICY_IDS.pikeAuto,
      tenantId: TENANT_ID,
      contactId: OWNER_CONTACT_IDS.pike,
      carrierId: CARRIER_IDS.vyrd,
      policyNumber: "VY-PA-44108",
      lineOfBusiness: "AUTO",
      status: "active",
      effectiveDate: new Date("2025-09-28T00:00:00.000Z"),
      expirationDate: new Date("2026-09-28T00:00:00.000Z"),
      premium: "1488.00",
    },
    {
      id: OWNER_POLICY_IDS.sotoLapsed,
      tenantId: TENANT_ID,
      contactId: OWNER_CONTACT_IDS.soto,
      carrierId: CARRIER_IDS.benchmark,
      policyNumber: "BM-HO-19004",
      lineOfBusiness: "HO",
      status: "lapsed",
      effectiveDate: new Date("2025-04-01T00:00:00.000Z"),
      expirationDate: new Date("2026-04-01T00:00:00.000Z"),
      premium: "2190.00",
      coverageA: 265000,
    },
  ];

  for (const row of bookPolicies) {
    await db
      .insert(policies)
      .values(row)
      .onConflictDoUpdate({
        target: policies.id,
        set: {
          contactId: row.contactId,
          dealId: row.dealId ?? null,
          carrierId: row.carrierId,
          policyNumber: row.policyNumber,
          lineOfBusiness: row.lineOfBusiness,
          status: row.status,
          effectiveDate: row.effectiveDate,
          expirationDate: row.expirationDate,
          premium: row.premium,
          coverageA: row.coverageA ?? null,
          updatedAt: new Date(),
        },
      });
  }

  const tasks: (typeof reviewTasks.$inferInsert)[] = [
    {
      id: OWNER_TASK_IDS.reyesIssue,
      tenantId: TENANT_ID,
      contactId: OWNER_CONTACT_IDS.reyes,
      dealId: OWNER_DEAL_IDS.reyes,
      kind: "issue",
      title: "Issue packet · Reyes Cocoa HO3",
      dueDate: new Date("2026-09-05T16:00:00.000Z"),
      status: "open",
    },
    {
      id: OWNER_TASK_IDS.sotoLapse,
      tenantId: TENANT_ID,
      contactId: OWNER_CONTACT_IDS.soto,
      policyId: OWNER_POLICY_IDS.sotoLapsed,
      kind: "lapse",
      title: "Lapse follow-up · Soto HO",
      dueDate: new Date("2026-09-04T16:00:00.000Z"),
      status: "open",
    },
  ];

  for (const row of tasks) {
    await db
      .insert(reviewTasks)
      .values(row)
      .onConflictDoUpdate({
        target: reviewTasks.id,
        set: {
          contactId: row.contactId,
          dealId: row.dealId ?? null,
          policyId: row.policyId ?? null,
          kind: row.kind,
          title: row.title,
          dueDate: row.dueDate,
          status: row.status,
        },
      });
  }

  await db
    .update(contacts)
    .set({
      policyCount: 1,
      notes:
        "Prior-book HO3 (FF-BK-HO-1044) is in force. The 2026-09-02 Palm Bay shop is still unbound — Cov A $321,000 is the worksheet, not a new policy. Auto, flood, and umbrella are open gaps.",
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, CONTACT_ID));
}
