import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts, contacts, deals, policies } from "@/lib/db/schema";
import { loadRecordValues } from "@/lib/custom-fields/store";
import { COVERAGE_CARRIER_FIELD_KEY, declaredCoverageFromFields } from "./declared-coverage";
import {
  COVERAGE_NOTICE_KINDS,
  parseNoticeKey,
  planContactNotices,
  type PlannedCoverageNotice,
} from "./notices";

export async function loadContactNoticeInputs(contactId: string) {
  const [contact] = await db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      ownerId: contacts.ownerId,
    })
    .from(contacts)
    .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, contactId)))
    .limit(1);
  if (!contact) return null;

  const [policyRows, dealRows, custom] = await Promise.all([
    db
      .select({
        id: policies.id,
        status: policies.status,
        lineOfBusiness: policies.lineOfBusiness,
        policyNumber: policies.policyNumber,
      })
      .from(policies)
      .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.contactId, contactId))),
    db
      .select({
        id: deals.id,
        title: deals.title,
        pipelineStage: deals.pipelineStage,
        lineOfBusiness: deals.lineOfBusiness,
      })
      .from(deals)
      .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.contactId, contactId))),
    loadRecordValues(contactId, "contacts").catch(() => ({}) as Record<string, string>),
  ]);

  const tagged =
    typeof custom.cross_selling_opportunity === "string" ? custom.cross_selling_opportunity.trim() : "";
  const declaredCoverage = declaredCoverageFromFields({
    existingCoverageTypes: custom.existing_coverage_types,
    carrierOfRecord: custom[COVERAGE_CARRIER_FIELD_KEY],
  });

  return {
    contact,
    policies: policyRows,
    deals: dealRows,
    taggedCrossSell: tagged || null,
    declaredCoverage,
    partyName: `${contact.firstName} ${contact.lastName}`.trim(),
  };
}

export async function syncContactCoverageNotices(contactId: string): Promise<PlannedCoverageNotice[]> {
  const id = contactId.trim();
  if (!id) return [];
  const loaded = await loadContactNoticeInputs(id);
  if (!loaded) return [];

  const planned = planContactNotices({
    contactId: loaded.contact.id,
    partyName: loaded.partyName,
    firstName: loaded.contact.firstName,
    lastName: loaded.contact.lastName,
    policies: loaded.policies,
    deals: loaded.deals,
    taggedCrossSell: loaded.taggedCrossSell,
    declaredCoverage: loaded.declaredCoverage,
  });

  const existing = await db
    .select()
    .from(alerts)
    .where(
      and(
        eq(alerts.tenantId, DEFAULT_TENANT_ID),
        eq(alerts.entityType, "contact"),
        eq(alerts.entityId, id),
        inArray(alerts.kind, [...COVERAGE_NOTICE_KINDS]),
      ),
    );

  const plannedKeys = new Set(planned.map((row) => `${row.kind}:${row.key}`));
  const unreadByKey = new Map<string, (typeof existing)[number]>();
  for (const row of existing) {
    if (row.readAt) continue;
    const key = parseNoticeKey(row.body);
    if (!key) continue;
    unreadByKey.set(`${row.kind}:${key}`, row);
  }

  const ownerId = loaded.contact.ownerId ?? null;
  for (const notice of planned) {
    const mapKey = `${notice.kind}:${notice.key}`;
    if (unreadByKey.has(mapKey)) continue;
    await db.insert(alerts).values({
      tenantId: DEFAULT_TENANT_ID,
      kind: notice.kind,
      title: notice.title,
      body: notice.body,
      severity: notice.severity,
      entityType: "contact",
      entityId: id,
      userId: ownerId,
      recipientUserId: ownerId,
    });
  }

  const now = new Date();
  for (const [mapKey, row] of unreadByKey) {
    if (plannedKeys.has(mapKey)) continue;
    await db.update(alerts).set({ readAt: now }).where(eq(alerts.id, row.id));
  }

  revalidatePath("/");
  revalidatePath("/notifications");
  revalidatePath("/alerts");
  revalidatePath(`/contacts/${id}`);
  return planned;
}

export async function syncContactCoverageNoticesSafe(contactId: string | null | undefined) {
  const id = contactId?.trim();
  if (!id) return;
  try {
    await syncContactCoverageNotices(id);
  } catch {
    // Never fail bind / save because a notice write missed.
  }
}
