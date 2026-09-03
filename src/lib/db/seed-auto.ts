import { and, eq, inArray } from "drizzle-orm";
import { db } from "./index";
import {
  carriers,
  clientHistory,
  contacts,
  deals,
  drivers,
  leads,
  policies,
  reviewTasks,
  risks,
  vehicles,
} from "./schema";
import {
  AUTO_CARRIER_ID,
  AUTO_CONTACT_ELENA,
  AUTO_CONTACT_RAFAEL,
  AUTO_DEAL_ID,
  AUTO_DRIVER_1,
  AUTO_DRIVER_2,
  AUTO_LEAD_ID,
  AUTO_POLICY_ID,
  AUTO_RISK_ID,
  AUTO_VEHICLE_1,
  AUTO_VEHICLE_2,
  TENANT_ID,
} from "../fixtures/ids";

const ADDRESS = {
  mailingAddress: "4128 Pine Isle Way",
  city: "Orlando",
  state: "FL",
  zip: "32801",
};

const EFFECTIVE = new Date("2026-03-01T15:00:00.000Z");
const EXPIRATION = new Date("2027-03-01T15:00:00.000Z");

/**
 * Demo Auto that is not Ana Dib. Rafael Soto is the named insured on an
 * in-force Orlando PA. Elena is a book Contact so a driver can link
 * `contact_id` without needing `contact_relationships`.
 */
export async function seedAutoBook() {
  await db
    .insert(carriers)
    .values({
      id: AUTO_CARRIER_ID,
      tenantId: TENANT_ID,
      name: "Progressive",
      naic: "16322",
      writtenLines: ["AUTO"],
      dontWriteNotes: "Personal auto demo market. No rater API — schedule is our AMS data.",
      portalStatus: "open",
      fixtureTag: "fl-auto-soto-2026",
      active: true,
    })
    .onConflictDoUpdate({
      target: carriers.id,
      set: {
        name: "Progressive",
        writtenLines: ["AUTO"],
        dontWriteNotes: "Personal auto demo market. No rater API — schedule is our AMS data.",
        portalStatus: "open",
        fixtureTag: "fl-auto-soto-2026",
        active: true,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(leads)
    .values({
      id: AUTO_LEAD_ID,
      tenantId: TENANT_ID,
      firstName: "Rafael",
      lastName: "Soto",
      email: "rafael.soto@example.com",
      phone: "407-555-0188",
      source: "book",
      status: "converted",
      notes: "Orlando personal auto. Bound after a one-car shop; schedule now has two vehicles.",
      convertedDealId: AUTO_DEAL_ID,
    })
    .onConflictDoUpdate({
      target: leads.id,
      set: {
        firstName: "Rafael",
        lastName: "Soto",
        status: "converted",
        convertedDealId: AUTO_DEAL_ID,
        notes: "Orlando personal auto. Bound after a one-car shop; schedule now has two vehicles.",
        updatedAt: new Date(),
      },
    });

  const people = [
    {
      id: AUTO_CONTACT_RAFAEL,
      firstName: "Rafael",
      lastName: "Soto",
      email: "rafael.soto@example.com",
      phone: "407-555-0188",
      tenureStart: EFFECTIVE,
      policyCount: 1,
      notes: "Named insured on FF-PA-4401. Account 360 shows 2 vehicles and 2 drivers.",
    },
    {
      id: AUTO_CONTACT_ELENA,
      firstName: "Elena",
      lastName: "Soto",
      email: "elena.soto@example.com",
      phone: "407-555-0189",
      tenureStart: EFFECTIVE,
      policyCount: 0,
      notes: "Spouse / listed driver. Contact row exists so driver.contact_id can link without a household table.",
    },
  ];

  for (const person of people) {
    await db
      .insert(contacts)
      .values({
        id: person.id,
        tenantId: TENANT_ID,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        phone: person.phone,
        ...ADDRESS,
        tenureStart: person.tenureStart,
        policyCount: person.policyCount,
        notes: person.notes,
      })
      .onConflictDoUpdate({
        target: contacts.id,
        set: {
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email,
          phone: person.phone,
          mailingAddress: ADDRESS.mailingAddress,
          city: ADDRESS.city,
          state: ADDRESS.state,
          zip: ADDRESS.zip,
          tenureStart: person.tenureStart,
          policyCount: person.policyCount,
          notes: person.notes,
          updatedAt: new Date(),
        },
      });
  }

  await db
    .insert(deals)
    .values({
      id: AUTO_DEAL_ID,
      tenantId: TENANT_ID,
      leadId: AUTO_LEAD_ID,
      contactId: AUTO_CONTACT_RAFAEL,
      title: "Soto · Orlando PA",
      pipelineStage: "bound",
      lineOfBusiness: "AUTO",
      state: "FL",
      primaryNamedInsured: "Rafael Soto",
      secondaryNamedInsured: "Elena Soto",
      boundAt: EFFECTIVE,
      notes: "Bound Progressive PA. Vehicles and drivers live on the Auto schedule — our data for Quote Sheet / Fill prefill, not a carrier API.",
    })
    .onConflictDoUpdate({
      target: deals.id,
      set: {
        leadId: AUTO_LEAD_ID,
        contactId: AUTO_CONTACT_RAFAEL,
        title: "Soto · Orlando PA",
        pipelineStage: "bound",
        lineOfBusiness: "AUTO",
        primaryNamedInsured: "Rafael Soto",
        secondaryNamedInsured: "Elena Soto",
        boundAt: EFFECTIVE,
        notes: "Bound Progressive PA. Vehicles and drivers live on the Auto schedule — our data for Quote Sheet / Fill prefill, not a carrier API.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(risks)
    .values({
      id: AUTO_RISK_ID,
      tenantId: TENANT_ID,
      dealId: AUTO_DEAL_ID,
      contactId: AUTO_CONTACT_RAFAEL,
      riskType: "auto",
      address1: ADDRESS.mailingAddress,
      city: ADDRESS.city,
      county: "Orange",
      state: ADDRESS.state,
      zip: ADDRESS.zip,
      garagingZip: ADDRESS.zip,
      vehicleYear: 2021,
      vehicleMake: "Honda",
      vehicleModel: "CR-V",
      vehicleUsage: "commute",
      vin: "7FARW2H58ME012441",
    })
    .onConflictDoUpdate({
      target: risks.id,
      set: {
        dealId: AUTO_DEAL_ID,
        contactId: AUTO_CONTACT_RAFAEL,
        riskType: "auto",
        address1: ADDRESS.mailingAddress,
        city: ADDRESS.city,
        county: "Orange",
        zip: ADDRESS.zip,
        garagingZip: ADDRESS.zip,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(policies)
    .values({
      id: AUTO_POLICY_ID,
      tenantId: TENANT_ID,
      contactId: AUTO_CONTACT_RAFAEL,
      dealId: AUTO_DEAL_ID,
      riskId: AUTO_RISK_ID,
      carrierId: AUTO_CARRIER_ID,
      policyNumber: "FF-PA-4401",
      lineOfBusiness: "AUTO",
      status: "active",
      effectiveDate: EFFECTIVE,
      expirationDate: EXPIRATION,
      premium: "1842.00",
    })
    .onConflictDoUpdate({
      target: policies.id,
      set: {
        contactId: AUTO_CONTACT_RAFAEL,
        dealId: AUTO_DEAL_ID,
        riskId: AUTO_RISK_ID,
        carrierId: AUTO_CARRIER_ID,
        policyNumber: "FF-PA-4401",
        lineOfBusiness: "AUTO",
        status: "active",
        effectiveDate: EFFECTIVE,
        expirationDate: EXPIRATION,
        premium: "1842.00",
        updatedAt: new Date(),
      },
    });

  await db
    .delete(vehicles)
    .where(and(eq(vehicles.tenantId, TENANT_ID), eq(vehicles.policyId, AUTO_POLICY_ID)));
  await db.insert(vehicles).values([
    {
      id: AUTO_VEHICLE_1,
      tenantId: TENANT_ID,
      policyId: AUTO_POLICY_ID,
      dealId: AUTO_DEAL_ID,
      riskId: AUTO_RISK_ID,
      year: 2021,
      make: "Honda",
      model: "CR-V",
      vin: "7FARW2H58ME012441",
      usage: "commute",
      garagingZip: "32801",
      garagingAddress: "4128 Pine Isle Way, Orlando, FL",
      sortOrder: 0,
    },
    {
      id: AUTO_VEHICLE_2,
      tenantId: TENANT_ID,
      policyId: AUTO_POLICY_ID,
      dealId: AUTO_DEAL_ID,
      riskId: AUTO_RISK_ID,
      year: 2018,
      make: "Toyota",
      model: "Camry",
      vin: "4T1B11HK5JU123890",
      usage: "pleasure",
      garagingZip: "32801",
      garagingAddress: "4128 Pine Isle Way, Orlando, FL",
      sortOrder: 1,
    },
  ]);

  await db
    .delete(drivers)
    .where(and(eq(drivers.tenantId, TENANT_ID), eq(drivers.policyId, AUTO_POLICY_ID)));
  await db.insert(drivers).values([
    {
      id: AUTO_DRIVER_1,
      tenantId: TENANT_ID,
      policyId: AUTO_POLICY_ID,
      dealId: AUTO_DEAL_ID,
      riskId: AUTO_RISK_ID,
      contactId: AUTO_CONTACT_RAFAEL,
      firstName: "Rafael",
      lastName: "Soto",
      dateOfBirth: new Date("1984-06-18T00:00:00.000Z"),
      licenseNumber: "S400123846180",
      licenseState: "FL",
      sortOrder: 0,
    },
    {
      id: AUTO_DRIVER_2,
      tenantId: TENANT_ID,
      policyId: AUTO_POLICY_ID,
      dealId: AUTO_DEAL_ID,
      riskId: AUTO_RISK_ID,
      contactId: AUTO_CONTACT_ELENA,
      firstName: "Elena",
      lastName: "Soto",
      dateOfBirth: new Date("1986-11-02T00:00:00.000Z"),
      licenseNumber: null,
      licenseState: "FL",
      sortOrder: 1,
    },
  ]);

  await db
    .delete(clientHistory)
    .where(and(eq(clientHistory.tenantId, TENANT_ID), eq(clientHistory.policyId, AUTO_POLICY_ID)));
  await db.insert(clientHistory).values({
    tenantId: TENANT_ID,
    contactId: AUTO_CONTACT_RAFAEL,
    dealId: AUTO_DEAL_ID,
    policyId: AUTO_POLICY_ID,
    eventType: "bind",
    body: "Bound Progressive FF-PA-4401. Two vehicles and two drivers on the Auto schedule.",
    occurredAt: EFFECTIVE,
  });

  await db
    .delete(reviewTasks)
    .where(and(eq(reviewTasks.tenantId, TENANT_ID), eq(reviewTasks.policyId, AUTO_POLICY_ID)));
  await db.insert(reviewTasks).values({
    tenantId: TENANT_ID,
    contactId: AUTO_CONTACT_RAFAEL,
    policyId: AUTO_POLICY_ID,
    dealId: AUTO_DEAL_ID,
    kind: "60_day",
    title: "60-day Auto review · FF-PA-4401",
    dueDate: new Date("2026-12-31T16:00:00.000Z"),
    status: "open",
  });

  // Guard: never attach this schedule to the Ana shop ids.
  const leaked = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.tenantId, TENANT_ID),
        inArray(vehicles.dealId, ["22222222-2222-4222-8222-222222222222"]),
      ),
    );
  if (leaked.length > 0) {
    throw new Error("Auto seed must not attach vehicles to the Ana HO shop.");
  }
}
