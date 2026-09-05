import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { playbookVisibleTo } from "@/lib/automations/engine";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "./index";
import { automationRuns, bulkSmsDrafts, emailSignatures, guidedAutomations, users } from "./schema";

const tenant = () => DEFAULT_TENANT_ID;

export async function listGuidedAutomations(opts?: { isAdmin?: boolean }) {
  const rows = await db
    .select()
    .from(guidedAutomations)
    .where(eq(guidedAutomations.tenantId, tenant()))
    .orderBy(desc(guidedAutomations.updatedAt));
  if (opts?.isAdmin === undefined) return rows;
  return rows.filter((row) => playbookVisibleTo(row.visibility, Boolean(opts.isAdmin)));
}

export async function listAutomationRuns(opts?: { isAdmin?: boolean }) {
  const rows = await db
    .select({
      run: automationRuns,
      playbook: guidedAutomations,
    })
    .from(automationRuns)
    .innerJoin(guidedAutomations, eq(automationRuns.automationId, guidedAutomations.id))
    .where(eq(automationRuns.tenantId, tenant()))
    .orderBy(desc(automationRuns.firedAt));
  if (opts?.isAdmin) return rows;
  return rows.filter((row) => row.run.audience === "agent" || row.run.audience === "both");
}

export async function countAutomationRunsByPlaybook(playbookIds: string[]) {
  if (playbookIds.length === 0) return new Map<string, number>();
  const rows = await db
    .select({
      automationId: automationRuns.automationId,
    })
    .from(automationRuns)
    .where(and(eq(automationRuns.tenantId, tenant()), inArray(automationRuns.automationId, playbookIds)));
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.automationId, (counts.get(row.automationId) ?? 0) + 1);
  }
  return counts;
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
