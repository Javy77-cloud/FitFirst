import { and, asc, eq, inArray } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { leadFollowUpQueue, leadFollowUpSteps, leadFollowUpTemplates } from "@/lib/db/schema";
import { ensureFollowUpPlaybooks } from "@/lib/leads/ensure-playbooks";
import { normalizeLeadStatus } from "@/lib/leads/queue";

export type FollowUpTemplateWithSteps = {
  id: string;
  name: string;
  triggerStatus: string;
  enabled: boolean;
  steps: Array<{
    id: string;
    sortOrder: number;
    method: string;
    delayAmount: number;
    delayUnit: string;
    message: string | null;
    remindVia: string;
  }>;
};

export async function listFollowUpTemplates(): Promise<FollowUpTemplateWithSteps[]> {
  await ensureFollowUpPlaybooks();
  const [templates, steps] = await Promise.all([
    db
      .select()
      .from(leadFollowUpTemplates)
      .where(eq(leadFollowUpTemplates.tenantId, DEFAULT_TENANT_ID))
      .orderBy(asc(leadFollowUpTemplates.name)),
    db
      .select()
      .from(leadFollowUpSteps)
      .where(eq(leadFollowUpSteps.tenantId, DEFAULT_TENANT_ID))
      .orderBy(asc(leadFollowUpSteps.sortOrder)),
  ]);
  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    triggerStatus: normalizeLeadStatus(template.triggerStatus),
    enabled: template.enabled,
    steps: steps
      .filter((step) => step.templateId === template.id)
      .map((step) => ({
        id: step.id,
        sortOrder: step.sortOrder,
        method: step.method,
        delayAmount: step.delayAmount,
        delayUnit: step.delayUnit,
        message: step.message,
        remindVia: step.remindVia,
      })),
  }));
}

export async function listLeadFollowUps(leadIds: string[]) {
  if (leadIds.length === 0) return [];
  return db
    .select()
    .from(leadFollowUpQueue)
    .where(and(eq(leadFollowUpQueue.tenantId, DEFAULT_TENANT_ID), inArray(leadFollowUpQueue.leadId, leadIds)))
    .orderBy(asc(leadFollowUpQueue.dueAt));
}
