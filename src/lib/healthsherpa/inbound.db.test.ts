import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { alerts, contacts, healthsherpaEnrollments, policies } from "@/lib/db/schema";
import { seed } from "@/lib/db/seed";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { ingestHealthSherpaWebhook } from "./inbound";
import { resolveHealthSherpaEnrollment } from "./review";

const MARKER = "hs-match-safety";

function medicarePayload(input: {
  applicationId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  hsContactId?: string;
  externalId?: string;
  confirmation?: string;
}) {
  return {
    medicare_application: {
      id: input.applicationId,
      carrier_name: "Devoted Health",
      confirmation_number: input.confirmation ?? `A${input.applicationId.replace(/-/g, "").slice(0, 14)}`,
      effective_date: "2026-02-01",
      plan_name: "DEVOTED CORE TEST",
      plan_type: "mapd",
      total_premium_cents: 5000,
    },
    contact: {
      id: input.hsContactId ?? randomUUID(),
      external_id: input.externalId ?? "CRM789012",
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email ?? `${MARKER}.${input.applicationId.slice(0, 8)}@hs.test`,
      phone_number: input.phone ?? "3055551234",
    },
  };
}

async function cleanup() {
  const enrollments = await db
    .select({
      id: healthsherpaEnrollments.id,
      policyId: healthsherpaEnrollments.policyId,
      contactId: healthsherpaEnrollments.contactId,
    })
    .from(healthsherpaEnrollments)
    .where(like(healthsherpaEnrollments.hsApplicationId, `${MARKER}%`));
  const enrollmentIds = enrollments.map((row) => row.id);
  const policyIds = enrollments.map((row) => row.policyId).filter((id): id is string => Boolean(id));
  const markedContacts = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), like(contacts.email, `${MARKER}%`)));
  const contactIds = [
    ...new Set([
      ...markedContacts.map((row) => row.id),
      ...enrollments.map((row) => row.contactId).filter((id): id is string => Boolean(id)),
    ]),
  ];
  if (policyIds.length) {
    await db.delete(policies).where(inArray(policies.id, policyIds));
  }
  await db.delete(policies).where(like(policies.sourceId, `${MARKER}%`));
  if (enrollmentIds.length) {
    await db.delete(alerts).where(inArray(alerts.entityId, enrollmentIds));
    await db.delete(healthsherpaEnrollments).where(inArray(healthsherpaEnrollments.id, enrollmentIds));
  }
  if (contactIds.length) {
    await db.delete(alerts).where(inArray(alerts.entityId, contactIds));
    await db.delete(contacts).where(inArray(contacts.id, contactIds));
  }
}

describe("HealthSherpa inbound contact-match safety", () => {
  beforeAll(async () => {
    await seed();
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("auto-links a strong exact-email match and mints an unpublished policy", async () => {
    const email = `${MARKER}.strong@book.test`;
    const [existing] = await db
      .insert(contacts)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        firstName: "Strong",
        lastName: "Match",
        email,
        phone: "3215550111",
        status: "active",
      })
      .returning({ id: contacts.id });
    const applicationId = `${MARKER}-strong-${randomUUID()}`;
    const result = await ingestHealthSherpaWebhook(
      medicarePayload({
        applicationId,
        firstName: "Different",
        lastName: "Name",
        email,
        confirmation: "ASTRONGMATCH001",
      }),
    );
    expect(result.accepted).toBe(true);
    expect(result.matchStatus).toBe("linked");
    expect(result.matchReason).toBe("email");
    expect(result.contactId).toBe(existing!.id);
    expect(result.policyId).toBeTruthy();
    const [policy] = await db.select().from(policies).where(eq(policies.id, result.policyId!));
    expect(policy?.status).toBe("unpublished");
    expect(policy?.contactId).toBe(existing!.id);
    const book = await db.select().from(contacts).where(like(contacts.email, `${MARKER}%`));
    expect(book.filter((row) => row.email === email)).toHaveLength(1);
  });

  it("sends a name-only renewal with a different email to review instead of creating a contact", async () => {
    const bookEmail = `${MARKER}.renewal@book.test`;
    const [existing] = await db
      .insert(contacts)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        firstName: "Renewal",
        lastName: "Neighbor",
        email: bookEmail,
        phone: "3215550222",
        status: "active",
      })
      .returning({ id: contacts.id });
    const applicationId = `${MARKER}-name-${randomUUID()}`;
    const result = await ingestHealthSherpaWebhook(
      medicarePayload({
        applicationId,
        firstName: "Renewal",
        lastName: "Neighbor",
        email: `${MARKER}.renewal+hs@other.test`,
        phone: "9995550000",
        confirmation: "ANAMEONLY0001",
      }),
    );
    expect(result.accepted).toBe(true);
    expect(result.matchStatus).toBe("needs_review");
    expect(result.matchReason).toBe("name");
    expect(result.contactId).toBeUndefined();
    expect(result.policyId).toBeUndefined();
    const after = await db.select().from(contacts).where(eq(contacts.firstName, "Renewal"));
    expect(after.filter((row) => row.lastName === "Neighbor")).toHaveLength(1);
    const [enrollment] = await db
      .select()
      .from(healthsherpaEnrollments)
      .where(eq(healthsherpaEnrollments.id, result.enrollmentId!));
    expect(enrollment?.contactId).toBeNull();
    expect(enrollment?.matchStatus).toBe("needs_review");
    expect(enrollment?.candidateContactId).toBe(existing!.id);
    expect(enrollment?.payload).toBeTruthy();

    const linked = await resolveHealthSherpaEnrollment({
      enrollmentId: result.enrollmentId!,
      action: "link",
      contactId: existing!.id,
    });
    expect(linked.ok).toBe(true);
    if (!linked.ok) return;
    expect(linked.contactId).toBe(existing!.id);
    expect(linked.policyId).toBeTruthy();
    const [updated] = await db
      .select()
      .from(healthsherpaEnrollments)
      .where(eq(healthsherpaEnrollments.id, result.enrollmentId!));
    expect(updated?.matchStatus).toBe("linked");
    expect(updated?.contactId).toBe(existing!.id);
    const [policy] = await db.select().from(policies).where(eq(policies.id, linked.policyId!));
    expect(policy?.status).toBe("unpublished");
    expect(policy?.contactId).toBe(existing!.id);
  });

  it("creates a new contact from an unmatched enrollment when the agent asks", async () => {
    const applicationId = `${MARKER}-create-${randomUUID()}`;
    const result = await ingestHealthSherpaWebhook(
      medicarePayload({
        applicationId,
        firstName: "Fresh",
        lastName: "Enrollee",
        email: `${MARKER}.fresh@hs.test`,
        phone: "7865550444",
        confirmation: "ACREATE0001",
      }),
    );
    expect(result.accepted).toBe(true);
    expect(result.matchStatus).toBe("unmatched");
    expect(result.contactId).toBeUndefined();
    const before = await db.select().from(contacts).where(eq(contacts.email, `${MARKER}.fresh@hs.test`));
    expect(before).toHaveLength(0);

    const created = await resolveHealthSherpaEnrollment({
      enrollmentId: result.enrollmentId!,
      action: "create",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, created.contactId));
    expect(contact?.firstName).toBe("Fresh");
    expect(contact?.email).toBe(`${MARKER}.fresh@hs.test`);
    expect(contact?.source).toBe("healthsherpa");
    expect(created.policyId).toBeTruthy();
    const [policy] = await db.select().from(policies).where(eq(policies.id, created.policyId!));
    expect(policy?.status).toBe("unpublished");
    const [enrollment] = await db
      .select()
      .from(healthsherpaEnrollments)
      .where(eq(healthsherpaEnrollments.id, result.enrollmentId!));
    expect(enrollment?.matchStatus).toBe("linked");
    expect(enrollment?.contactId).toBe(created.contactId);
  });
});
