import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { contacts, leads, mergeCandidates } from "@/lib/db/schema";
import { findDuplicatePairs } from "./match";

export async function refreshMergeCandidates() {
  const tenantId = DEFAULT_TENANT_ID;
  const [contactRows, leadRows] = await Promise.all([
    db.select().from(contacts).where(eq(contacts.tenantId, tenantId)),
    db.select().from(leads).where(eq(leads.tenantId, tenantId)),
  ]);

  const detected = [
    ...findDuplicatePairs("contact", contactRows),
    ...findDuplicatePairs("lead", leadRows),
  ];

  const existing = await db
    .select()
    .from(mergeCandidates)
    .where(eq(mergeCandidates.tenantId, tenantId));

  const existingKey = new Map(
    existing.map((row) => [`${row.entityType}:${row.leftId}:${row.rightId}`, row]),
  );

  for (const pair of detected) {
    const key = `${pair.entityType}:${pair.leftId}:${pair.rightId}`;
    const row = existingKey.get(key);
    if (!row) {
      await db.insert(mergeCandidates).values({
        tenantId,
        entityType: pair.entityType,
        leftId: pair.leftId,
        rightId: pair.rightId,
        matchReasons: pair.matchReasons,
        status: "open",
      });
      continue;
    }
    if (row.status === "open") {
      await db
        .update(mergeCandidates)
        .set({ matchReasons: pair.matchReasons, updatedAt: new Date() })
        .where(and(eq(mergeCandidates.tenantId, tenantId), eq(mergeCandidates.id, row.id)));
    }
  }

  return detected.length;
}
