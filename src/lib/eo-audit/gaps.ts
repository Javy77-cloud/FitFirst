import { addUtcDays } from "@/lib/home/as-of";
import { QUOTE_SENT_STAGES } from "@/lib/home/aggregate";
import {
  EO_GAP_LABEL,
  EO_GAP_SEVERITY,
  RENEWAL_SILENT_DAYS,
  isEoClientAction,
  type EoGapKind,
} from "./types";

export type EoActivityStamp = {
  occurredAt: Date;
  action: string;
  contactId?: string | null;
  accountId?: string | null;
  policyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
};

export type EoPolicySnap = {
  id: string;
  policyNumber: string;
  status: string;
  expirationDate: Date;
  renewalDate: Date | null;
  contactId: string | null;
  accountId: string | null;
  dealId: string | null;
  partyLabel: string;
};

export type EoDealSnap = {
  id: string;
  title: string;
  pipelineStage: string;
  pipelineStageSlug?: string | null;
  contactId: string | null;
  leadId: string | null;
};

export type EoDocSnap = {
  slot: string;
  docType: string;
  policyId?: string | null;
  dealId?: string | null;
};

export type EoTaskSnap = {
  kind: string;
  dealId?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  policyId?: string | null;
};

export type EoGapFlag = {
  kind: EoGapKind;
  severity: "warning" | "high";
  title: string;
  body: string;
  entityType: "policy" | "deal";
  entityId: string;
  recordLabel: string;
};

export function renewalAnchor(policy: Pick<EoPolicySnap, "renewalDate" | "expirationDate">): Date {
  return policy.renewalDate ?? policy.expirationDate;
}

export function renewalWindowOpen(anchor: Date, asOf: Date, days = RENEWAL_SILENT_DAYS): boolean {
  const windowStart = addUtcDays(anchor, -days);
  return asOf.getTime() >= windowStart.getTime() && asOf.getTime() <= anchor.getTime();
}

export function isBoundForSignedApp(status: string): boolean {
  const next = status.trim().toLowerCase();
  return next === "bound" || next === "pending";
}

export function isQuoteSentStage(stage: string | null | undefined): boolean {
  return QUOTE_SENT_STAGES.has((stage ?? "").trim().toLowerCase());
}

export function hasSignedApp(
  docs: EoDocSnap[],
  policy: Pick<EoPolicySnap, "id" | "dealId">,
): boolean {
  return docs.some((doc) => {
    const signed = doc.slot === "signed_app" || doc.docType === "signed_app";
    if (!signed) return false;
    if (doc.policyId && doc.policyId === policy.id) return true;
    if (policy.dealId && doc.dealId === policy.dealId) return true;
    return false;
  });
}

export function hasFollowUpTask(tasks: EoTaskSnap[], deal: EoDealSnap): boolean {
  return tasks.some((task) => {
    if (task.kind !== "task") return false;
    if (task.dealId && task.dealId === deal.id) return true;
    if (deal.contactId && task.contactId === deal.contactId) return true;
    if (deal.leadId && task.leadId === deal.leadId) return true;
    return false;
  });
}

export function activityTouchesPolicy(stamp: EoActivityStamp, policy: EoPolicySnap): boolean {
  if (stamp.policyId && stamp.policyId === policy.id) return true;
  if (policy.dealId && stamp.dealId === policy.dealId) return true;
  if (policy.contactId && stamp.contactId === policy.contactId) return true;
  if (policy.accountId && stamp.accountId === policy.accountId) return true;
  return false;
}

export function hasClientActivityInWindow(
  stamps: EoActivityStamp[],
  policy: EoPolicySnap,
  windowStart: Date,
  windowEnd: Date,
): boolean {
  return stamps.some((stamp) => {
    if (!isEoClientAction(stamp.action)) return false;
    if (!activityTouchesPolicy(stamp, policy)) return false;
    const at = stamp.occurredAt.getTime();
    return at >= windowStart.getTime() && at <= windowEnd.getTime();
  });
}

export function findEoGaps(input: {
  asOf: Date;
  policies: EoPolicySnap[];
  deals: EoDealSnap[];
  docs: EoDocSnap[];
  tasks: EoTaskSnap[];
  stamps: EoActivityStamp[];
}): EoGapFlag[] {
  const flags: EoGapFlag[] = [];

  for (const policy of input.policies) {
    const anchor = renewalAnchor(policy);
    if (renewalWindowOpen(anchor, input.asOf)) {
      const windowStart = addUtcDays(anchor, -RENEWAL_SILENT_DAYS);
      if (!hasClientActivityInWindow(input.stamps, policy, windowStart, anchor)) {
        flags.push({
          kind: "renewal_silent_90",
          severity: EO_GAP_SEVERITY.renewal_silent_90,
          title: EO_GAP_LABEL.renewal_silent_90,
          body: `${policy.partyLabel} · ${policy.policyNumber} renews ${anchor.toISOString().slice(0, 10)}. No email, SMS, call, or meeting on the file in the 90-day window.`,
          entityType: "policy",
          entityId: policy.id,
          recordLabel: `${policy.partyLabel} · ${policy.policyNumber}`,
        });
      }
    }

    if (isBoundForSignedApp(policy.status) && !hasSignedApp(input.docs, policy)) {
      flags.push({
        kind: "bound_missing_signed_app",
        severity: EO_GAP_SEVERITY.bound_missing_signed_app,
        title: EO_GAP_LABEL.bound_missing_signed_app,
        body: `${policy.partyLabel} · ${policy.policyNumber} is ${policy.status} with no signed application on the Deal or Policy.`,
        entityType: "policy",
        entityId: policy.id,
        recordLabel: `${policy.partyLabel} · ${policy.policyNumber}`,
      });
    }
  }

  for (const deal of input.deals) {
    const stage = deal.pipelineStageSlug || deal.pipelineStage;
    if (!isQuoteSentStage(stage) && !isQuoteSentStage(deal.pipelineStage)) continue;
    if (hasFollowUpTask(input.tasks, deal)) continue;
    flags.push({
      kind: "quote_sent_no_followup",
      severity: EO_GAP_SEVERITY.quote_sent_no_followup,
      title: EO_GAP_LABEL.quote_sent_no_followup,
      body: `${deal.title} is Quote Sent with no desk follow-up task. Stay in-app — do not blast the client.`,
      entityType: "deal",
      entityId: deal.id,
      recordLabel: deal.title,
    });
  }

  const order: Record<EoGapKind, number> = {
    bound_missing_signed_app: 0,
    renewal_silent_90: 1,
    quote_sent_no_followup: 2,
  };
  return flags.sort((a, b) => order[a.kind] - order[b.kind] || a.recordLabel.localeCompare(b.recordLabel));
}
