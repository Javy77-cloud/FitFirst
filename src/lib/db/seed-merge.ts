import { db } from "./index";
import {
  activities,
  clientHistory,
  contacts,
  deals,
  locations,
  mergeCandidates,
  policies,
  reviewTasks,
} from "./schema";
import { CARRIER_IDS, MERGE_IDS, TENANT_ID } from "../fixtures/ids";
import { findDuplicatePairs } from "../merge/match";

const ids = MERGE_IDS;

export async function seedMergeDuplicates() {
  await db
    .insert(contacts)
    .values({
      id: ids.contactKeeper,
      tenantId: TENANT_ID,
      firstName: "Rosa",
      lastName: "Keene",
      email: "Rosa.Keene@example.com",
      phone: "(321) 555-0148",
      mailingAddress: "412 Harbor Lane",
      city: "Melbourne",
      state: "FL",
      zip: "32901",
      dateOfBirth: null,
      tenureStart: new Date("2024-03-01T15:00:00.000Z"),
      policyCount: 1,
      notes: "Book HO3 from a prior agency. Harbor Lane is the mailing address.",
      lifeNotes: null,
      healthNotes: null,
      status: "active",
    })
    .onConflictDoUpdate({
      target: contacts.id,
      set: {
        firstName: "Rosa",
        lastName: "Keene",
        email: "Rosa.Keene@example.com",
        phone: "(321) 555-0148",
        mailingAddress: "412 Harbor Lane",
        city: "Melbourne",
        state: "FL",
        zip: "32901",
        dateOfBirth: null,
        tenureStart: new Date("2024-03-01T15:00:00.000Z"),
        policyCount: 1,
        notes: "Book HO3 from a prior agency. Harbor Lane is the mailing address.",
        lifeNotes: null,
        status: "active",
        mergedIntoId: null,
        archivedAt: null,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(contacts)
    .values({
      id: ids.contactDuplicate,
      tenantId: TENANT_ID,
      firstName: "Rosa",
      lastName: "Keene",
      email: "rosa.keene@example.com",
      phone: null,
      mailingAddress: null,
      city: "Melbourne",
      state: "FL",
      zip: "32901",
      dateOfBirth: "1979-04-12",
      tenureStart: null,
      policyCount: 0,
      notes: "Second record from a Facebook lead form. Same Harbor house.",
      lifeNotes: "Term inquiry 2025 — CRM note only. No life rating.",
      healthNotes: null,
      status: "active",
    })
    .onConflictDoUpdate({
      target: contacts.id,
      set: {
        firstName: "Rosa",
        lastName: "Keene",
        email: "rosa.keene@example.com",
        phone: null,
        mailingAddress: null,
        dateOfBirth: "1979-04-12",
        notes: "Second record from a Facebook lead form. Same Harbor house.",
        lifeNotes: "Term inquiry 2025 — CRM note only. No life rating.",
        status: "active",
        mergedIntoId: null,
        archivedAt: null,
        policyCount: 0,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(deals)
    .values({
      id: ids.dealKeeper,
      tenantId: TENANT_ID,
      contactId: ids.contactKeeper,
      title: "Keene · Melbourne HO3 (book)",
      pipelineStage: "bound",
      lineOfBusiness: "HO",
      state: "FL",
      primaryNamedInsured: "Rosa Keene",
      notes: "Prior-book homeowners. Not Ana. Not from the 2026-09-02 shop.",
      boundAt: new Date("2024-03-01T15:00:00.000Z"),
    })
    .onConflictDoUpdate({
      target: deals.id,
      set: {
        contactId: ids.contactKeeper,
        title: "Keene · Melbourne HO3 (book)",
        pipelineStage: "bound",
        notes: "Prior-book homeowners. Not Ana. Not from the 2026-09-02 shop.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(deals)
    .values({
      id: ids.dealDuplicate,
      tenantId: TENANT_ID,
      contactId: ids.contactDuplicate,
      title: "Keene · umbrella shop",
      pipelineStage: "shopping",
      lineOfBusiness: "UMBRELLA",
      state: "FL",
      primaryNamedInsured: "Rosa Keene",
      notes: "Umbrella shop opened from the duplicate Facebook contact.",
    })
    .onConflictDoUpdate({
      target: deals.id,
      set: {
        contactId: ids.contactDuplicate,
        title: "Keene · umbrella shop",
        pipelineStage: "shopping",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(policies)
    .values({
      id: ids.policyKeeper,
      tenantId: TENANT_ID,
      contactId: ids.contactKeeper,
      dealId: ids.dealKeeper,
      carrierId: CARRIER_IDS.americanIntegrity,
      policyNumber: "FF-BK-HO-4120",
      lineOfBusiness: "HO",
      status: "active",
      effectiveDate: new Date("2024-03-01T05:00:00.000Z"),
      expirationDate: new Date("2027-03-01T05:00:00.000Z"),
      premium: "1840.00",
      coverageA: 410000,
    })
    .onConflictDoUpdate({
      target: policies.id,
      set: {
        contactId: ids.contactKeeper,
        policyNumber: "FF-BK-HO-4120",
        status: "active",
        coverageA: 410000,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(locations)
    .values({
      id: ids.locationKeeper,
      tenantId: TENANT_ID,
      contactId: ids.contactKeeper,
      kind: "property",
      label: "Harbor Lane dwelling",
      address1: "412 Harbor Lane",
      city: "Melbourne",
      county: "Brevard",
      state: "FL",
      zip: "32901",
    })
    .onConflictDoUpdate({
      target: locations.id,
      set: {
        contactId: ids.contactKeeper,
        address1: "412 Harbor Lane",
        city: "Melbourne",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(locations)
    .values({
      id: ids.locationDuplicate,
      tenantId: TENANT_ID,
      contactId: ids.contactDuplicate,
      kind: "prior",
      label: "Old Pine Ave mailing",
      address1: "88 Pine Ave",
      city: "Melbourne",
      county: "Brevard",
      state: "FL",
      zip: "32901",
    })
    .onConflictDoUpdate({
      target: locations.id,
      set: {
        contactId: ids.contactDuplicate,
        address1: "88 Pine Ave",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(activities)
    .values({
      id: ids.activityKeeper,
      tenantId: TENANT_ID,
      kind: "call",
      title: "Called about roof bid",
      notes: "Rosa sent a 2024 roof estimate. Logged on the book contact.",
      status: "done",
      startAt: new Date("2026-08-12T17:30:00.000Z"),
      contactId: ids.contactKeeper,
      dealId: ids.dealKeeper,
      policyId: ids.policyKeeper,
    })
    .onConflictDoUpdate({
      target: activities.id,
      set: {
        contactId: ids.contactKeeper,
        title: "Called about roof bid",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(activities)
    .values({
      id: ids.activityDuplicate,
      tenantId: TENANT_ID,
      kind: "call",
      title: "Left voicemail on Facebook lead",
      notes: "Same person. This note lives on the duplicate until merge.",
      status: "open",
      startAt: new Date("2026-08-20T14:00:00.000Z"),
      contactId: ids.contactDuplicate,
      dealId: ids.dealDuplicate,
    })
    .onConflictDoUpdate({
      target: activities.id,
      set: {
        contactId: ids.contactDuplicate,
        title: "Left voicemail on Facebook lead",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(clientHistory)
    .values({
      id: ids.historyKeeper,
      tenantId: TENANT_ID,
      contactId: ids.contactKeeper,
      dealId: ids.dealKeeper,
      policyId: ids.policyKeeper,
      eventType: "book",
      body: "Imported book HO3 FF-BK-HO-4120. Not created from a quote.",
      occurredAt: new Date("2024-03-01T15:00:00.000Z"),
    })
    .onConflictDoUpdate({
      target: clientHistory.id,
      set: {
        contactId: ids.contactKeeper,
        body: "Imported book HO3 FF-BK-HO-4120. Not created from a quote.",
      },
    });

  await db
    .insert(reviewTasks)
    .values({
      id: ids.taskKeeper,
      tenantId: TENANT_ID,
      contactId: ids.contactKeeper,
      policyId: ids.policyKeeper,
      dealId: ids.dealKeeper,
      kind: "expiration",
      title: "Renewal glance · FF-BK-HO-4120",
      dueDate: new Date("2027-01-15T15:00:00.000Z"),
      status: "open",
    })
    .onConflictDoUpdate({
      target: reviewTasks.id,
      set: {
        contactId: ids.contactKeeper,
        title: "Renewal glance · FF-BK-HO-4120",
      },
    });

  const pair = findDuplicatePairs("contact", [
    {
      id: ids.contactKeeper,
      firstName: "Rosa",
      lastName: "Keene",
      email: "Rosa.Keene@example.com",
      phone: "(321) 555-0148",
      mailingAddress: "412 Harbor Lane",
      city: "Melbourne",
      state: "FL",
      zip: "32901",
    },
    {
      id: ids.contactDuplicate,
      firstName: "Rosa",
      lastName: "Keene",
      email: "rosa.keene@example.com",
      city: "Melbourne",
      state: "FL",
      zip: "32901",
    },
  ])[0];

  await db
    .insert(mergeCandidates)
    .values({
      id: ids.candidate,
      tenantId: TENANT_ID,
      entityType: "contact",
      leftId: pair?.leftId ?? ids.contactDuplicate,
      rightId: pair?.rightId ?? ids.contactKeeper,
      matchReasons: pair?.matchReasons ?? ["email"],
      status: "open",
    })
    .onConflictDoUpdate({
      target: mergeCandidates.id,
      set: {
        status: "open",
        leftId: pair?.leftId ?? ids.contactDuplicate,
        rightId: pair?.rightId ?? ids.contactKeeper,
        matchReasons: pair?.matchReasons ?? ["email"],
        keeperId: null,
        duplicateId: null,
        mergedAt: null,
        updatedAt: new Date(),
      },
    });
}
