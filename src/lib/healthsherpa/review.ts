import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { contacts, healthsherpaEnrollments } from "@/lib/db/schema";
import { formatPersonName } from "@/lib/crm/display";
import {
  attachHealthSherpaEnrollment,
  createContactFromHealthSherpaPayload,
} from "./inbound";
import { parseHealthSherpaPayload } from "./payload";
import {
  allowHealthSherpaTestPayloadWrites,
  isHealthSherpaTestOrSamplePayload,
} from "./test-payload";
import { HEALTHSHERPA_IGNORED_TEST_REASON } from "./copy";
import {
  healthSherpaMatchReasonLabel,
  type HealthSherpaMatchKind,
  type HealthSherpaMatchStatus,
} from "./contact-match";

export const HEALTHSHERPA_REVIEW_STATUSES = ["needs_review", "unmatched"] as const;

export type HealthSherpaReviewContact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
};

export type HealthSherpaReviewRow = {
  id: string;
  product: string;
  event: string;
  confirmationNumber: string | null;
  hsApplicationId: string | null;
  matchStatus: HealthSherpaMatchStatus;
  matchReason: HealthSherpaMatchKind;
  matchReasonLabel: string;
  candidateContactId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  planLabel: string;
  createdAt: Date;
};

export type HealthSherpaResolveResult =
  | { ok: true; contactId: string; policyId: string | null; enrollmentId: string }
  | { ok: false; code: string; message: string };

export async function countHealthSherpaReviewEnrollments(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(healthsherpaEnrollments)
    .where(
      and(
        eq(healthsherpaEnrollments.tenantId, DEFAULT_TENANT_ID),
        inArray(healthsherpaEnrollments.matchStatus, [...HEALTHSHERPA_REVIEW_STATUSES]),
      ),
    );
  return row?.count ?? 0;
}

export async function listHealthSherpaReviewEnrollments(): Promise<HealthSherpaReviewRow[]> {
  const rows = await db
    .select()
    .from(healthsherpaEnrollments)
    .where(
      and(
        eq(healthsherpaEnrollments.tenantId, DEFAULT_TENANT_ID),
        inArray(healthsherpaEnrollments.matchStatus, [...HEALTHSHERPA_REVIEW_STATUSES]),
      ),
    )
    .orderBy(desc(healthsherpaEnrollments.createdAt));

  return rows.map((row) => {
    const parsed = row.payload ? parseHealthSherpaPayload(row.payload) : null;
    const firstName = parsed?.contact.firstName || "Unknown";
    const lastName = parsed?.contact.lastName || "Enrollment";
    const matchReason = (row.matchReason as HealthSherpaMatchKind | null) ?? "none";
    return {
      id: row.id,
      product: row.product,
      event: row.event,
      confirmationNumber: row.confirmationNumber,
      hsApplicationId: row.hsApplicationId,
      matchStatus: (row.matchStatus as HealthSherpaMatchStatus) ?? "unmatched",
      matchReason,
      matchReasonLabel: healthSherpaMatchReasonLabel(matchReason),
      candidateContactId: row.candidateContactId,
      firstName,
      lastName,
      email: parsed?.contact.email ?? null,
      phone: parsed?.contact.phone ?? null,
      planLabel: [parsed?.carrierName, parsed?.planName ?? parsed?.policySubType].filter(Boolean).join(" · "),
      createdAt: row.createdAt,
    };
  });
}

export async function listHealthSherpaReviewContacts(): Promise<HealthSherpaReviewContact[]> {
  return db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone,
    })
    .from(contacts)
    .where(eq(contacts.tenantId, DEFAULT_TENANT_ID))
    .orderBy(asc(contacts.lastName), asc(contacts.firstName));
}

export function contactPickerLabel(contact: HealthSherpaReviewContact): string {
  const bits = [formatPersonName(contact)];
  if (contact.email) bits.push(contact.email);
  if (contact.phone) bits.push(contact.phone);
  return bits.filter(Boolean).join(" · ");
}

export async function resolveHealthSherpaEnrollment(input: {
  enrollmentId: string;
  action: "link" | "create";
  contactId?: string | null;
}): Promise<HealthSherpaResolveResult> {
  const enrollmentId = input.enrollmentId.trim();
  if (!enrollmentId) {
    return { ok: false, code: "missing", message: "Enrollment is required." };
  }

  const [row] = await db
    .select()
    .from(healthsherpaEnrollments)
    .where(
      and(eq(healthsherpaEnrollments.tenantId, DEFAULT_TENANT_ID), eq(healthsherpaEnrollments.id, enrollmentId)),
    )
    .limit(1);
  if (!row) return { ok: false, code: "missing", message: "Enrollment not found." };

  if (row.matchStatus === "linked" && row.contactId) {
    return {
      ok: true,
      contactId: row.contactId,
      policyId: row.policyId,
      enrollmentId: row.id,
    };
  }

  const parsed = row.payload ? parseHealthSherpaPayload(row.payload) : null;
  if (!parsed?.contact.firstName || !parsed.contact.lastName) {
    return { ok: false, code: "payload", message: "Enrollment payload is missing a first or last name." };
  }

  if (isHealthSherpaTestOrSamplePayload(parsed) && !allowHealthSherpaTestPayloadWrites()) {
    return { ok: false, code: "test_payload", message: HEALTHSHERPA_IGNORED_TEST_REASON };
  }

  let contactId = input.contactId?.trim() || null;
  let matchReason: HealthSherpaMatchKind = (row.matchReason as HealthSherpaMatchKind | null) ?? "none";

  if (input.action === "link") {
    if (!contactId) return { ok: false, code: "contact", message: "Choose an existing contact to link." };
    const [existing] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, contactId)))
      .limit(1);
    if (!existing) return { ok: false, code: "contact", message: "That contact is not on the book." };
    matchReason = row.candidateContactId === contactId && row.matchReason === "name" ? "name" : matchReason;
  } else {
    contactId = await createContactFromHealthSherpaPayload(parsed);
    matchReason = "none";
  }

  const attached = await attachHealthSherpaEnrollment({
    parsed,
    payload: row.payload ?? {},
    contactId,
    matchReason,
    existingEnrollmentId: row.id,
  });

  return {
    ok: true,
    contactId,
    policyId: attached.policyId,
    enrollmentId: attached.enrollmentId,
  };
}
