import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { coalesceAsync } from "@/lib/alerts/coalesce";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts, contacts, deals, policies } from "@/lib/db/schema";
import { loadRecordValues } from "@/lib/custom-fields/store";
import { planEpisodeSync } from "@/lib/alerts/episode";
import { COVERAGE_CARRIER_FIELD_KEY, declaredCoverageFromFields } from "./declared-coverage";
import {
  declaredCoverageFromElsewhere,
  mergeDeclaredCoverage,
  parseElsewhereCoverage,
} from "./elsewhere-coverage";
import { ensureElsewhereCoverageColumn } from "@/lib/db/ensure-elsewhere-coverage";
import {
  COVERAGE_NOTICE_KINDS,
  parseNoticeKey,
  planContactNotices,
  type PlannedCoverageNotice,
} from "./notices";

export async function loadContactNoticeInputs(contactId: string) {
  await ensureElsewhereCoverageColumn().catch(() => false);
  const [contact] = await db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      ownerId: contacts.ownerId,
      elsewhereCoverage: contacts.elsewhereCoverage,
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

  const declaredCoverage = mergeDeclaredCoverage(
    declaredCoverageFromFields({
      existingCoverageTypes: custom.existing_coverage_types,
      carrierOfRecord: custom[COVERAGE_CARRIER_FIELD_KEY],
    }),
    declaredCoverageFromElsewhere(parseElsewhereCoverage(contact.elsewhereCoverage)),
  );

  return {
    contact,
    policies: policyRows,
    deals: dealRows,
    declaredCoverage,
    partyName: `${contact.firstName} ${contact.lastName}`.trim(),
  };
}

export async function syncContactCoverageNotices(contactId: string): Promise<PlannedCoverageNotice[]> {
  const id = contactId.trim();
  if (!id) return [];
  return coalesceAsync(`coverage-notices:${id}`, () => syncContactCoverageNoticesOnce(id));
}

async function syncContactCoverageNoticesOnce(contactId: string): Promise<PlannedCoverageNotice[]> {
  const loaded = await loadContactNoticeInputs(contactId);
  if (!loaded) return [];

  const planned = planContactNotices({
    contactId: loaded.contact.id,
    partyName: loaded.partyName,
    firstName: loaded.contact.firstName,
    lastName: loaded.contact.lastName,
    policies: loaded.policies,
    deals: loaded.deals,
    declaredCoverage: loaded.declaredCoverage,
  });

  const existing = await db
    .select()
    .from(alerts)
    .where(
      and(
        eq(alerts.tenantId, DEFAULT_TENANT_ID),
        eq(alerts.entityType, "contact"),
        eq(alerts.entityId, contactId),
        inArray(alerts.kind, [...COVERAGE_NOTICE_KINDS]),
      ),
    );

  // One notice per gap/opportunity episode: any prior (read or unread) suppresses
  // re-insert while the condition still holds; drop when the gap clears.
  // planEpisodeSync also collapses duplicate rows for the same live key.
  const existingEpisodes = existing
    .map((row) => {
      const noticeKey = parseNoticeKey(row.body);
      if (!noticeKey) return null;
      return { id: row.id, key: `${row.kind}:${noticeKey}`, readAt: row.readAt };
    })
    .filter(Boolean) as { id: string; key: string; readAt: Date | null }[];

  const liveKeys = planned.map((row) => `${row.kind}:${row.key}`);
  const { insertKeys, endEpisodeAlertIds } = planEpisodeSync(liveKeys, existingEpisodes);
  const insertSet = new Set(insertKeys);

  const ownerId = loaded.contact.ownerId ?? null;
  for (const notice of planned) {
    const mapKey = `${notice.kind}:${notice.key}`;
    if (!insertSet.has(mapKey)) continue;
    await db.insert(alerts).values({
      tenantId: DEFAULT_TENANT_ID,
      kind: notice.kind,
      title: notice.title,
      body: notice.body,
      severity: notice.severity,
      entityType: "contact",
      entityId: contactId,
      userId: ownerId,
      recipientUserId: ownerId,
    });
  }

  if (endEpisodeAlertIds.length) {
    await db.delete(alerts).where(inArray(alerts.id, endEpisodeAlertIds));
  }

  revalidatePath("/");
  revalidatePath("/notifications");
  revalidatePath("/alerts");
  revalidatePath(`/contacts/${contactId}`);
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
