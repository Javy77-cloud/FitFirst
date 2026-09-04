import { and, desc, eq, isNull, or } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "./index";
import { bulkSmsDrafts, emailSignatures, guidedAutomations, users } from "./schema";

const tenant = () => DEFAULT_TENANT_ID;

export async function listGuidedAutomations() {
  return db
    .select()
    .from(guidedAutomations)
    .where(eq(guidedAutomations.tenantId, tenant()))
    .orderBy(desc(guidedAutomations.updatedAt));
}

export async function getGuidedAutomation(id: string) {
  const [row] = await db
    .select()
    .from(guidedAutomations)
    .where(and(eq(guidedAutomations.tenantId, tenant()), eq(guidedAutomations.id, id)));
  return row ?? null;
}

export async function listBulkSmsDrafts() {
  return db
    .select()
    .from(bulkSmsDrafts)
    .where(eq(bulkSmsDrafts.tenantId, tenant()))
    .orderBy(desc(bulkSmsDrafts.updatedAt));
}

export async function listSignaturesWithOwners() {
  return db
    .select({
      signature: emailSignatures,
      owner: users,
    })
    .from(emailSignatures)
    .leftJoin(users, eq(emailSignatures.ownerUserId, users.id))
    .where(eq(emailSignatures.tenantId, tenant()))
    .orderBy(desc(emailSignatures.updatedAt));
}

export async function listPendingSignatureApprovals() {
  return db
    .select({
      signature: emailSignatures,
      owner: users,
    })
    .from(emailSignatures)
    .leftJoin(users, eq(emailSignatures.ownerUserId, users.id))
    .where(
      and(eq(emailSignatures.tenantId, tenant()), eq(emailSignatures.approvalStatus, "pending")),
    )
    .orderBy(desc(emailSignatures.submittedAt));
}

export async function listMySignatures(userId: string) {
  return db
    .select()
    .from(emailSignatures)
    .where(
      and(eq(emailSignatures.tenantId, tenant()), eq(emailSignatures.ownerUserId, userId)),
    )
    .orderBy(desc(emailSignatures.updatedAt));
}

export async function listLiveAgencySignatures() {
  return db
    .select()
    .from(emailSignatures)
    .where(
      and(
        eq(emailSignatures.tenantId, tenant()),
        eq(emailSignatures.approvalStatus, "live"),
        or(isNull(emailSignatures.ownerUserId), eq(emailSignatures.isDefault, true)),
      ),
    )
    .orderBy(desc(emailSignatures.isDefault));
}
