import { daysUntilDate, relativeTouchLabel } from "@/lib/book-lists/heat";
import type { AgentPolicyTab } from "@/lib/policy/tabs";

export type PolicyCareItem = {
  key: string;
  tab: AgentPolicyTab;
  label: string;
  why: string;
  count: number;
};

export function buildPolicyCareItems(input: {
  expirationDate?: Date | string | null;
  updatedAt?: Date | string | null;
  status?: string | null;
  missingDocs?: number;
  pendingEndorsements?: number;
  openClaims?: number;
  asOf: Date;
}): PolicyCareItem[] {
  const items: PolicyCareItem[] = [];
  const daysUntil = daysUntilDate(input.expirationDate ?? null, input.asOf);
  const lastTouch = input.updatedAt
    ? Math.max(
        0,
        Math.floor((input.asOf.getTime() - new Date(input.updatedAt).getTime()) / 86_400_000),
      )
    : null;
  const lapsed = /lapse|cancel|expired|terminated/i.test(input.status ?? "");

  if (lapsed || (daysUntil != null && daysUntil < 30)) {
    items.push({
      key: "renewal",
      tab: "overview",
      label: "Renewal",
      why:
        lapsed
          ? "This term is off-book — confirm rewrite or cancel path."
          : `Expires in ${daysUntil} day${daysUntil === 1 ? "" : "s"}.`,
      count: 1,
    });
  }
  if ((input.missingDocs ?? 0) > 0) {
    items.push({
      key: "documents",
      tab: "documents",
      label: "Documents",
      why: `${input.missingDocs} servicing file${input.missingDocs === 1 ? "" : "s"} still missing.`,
      count: input.missingDocs ?? 0,
    });
  }
  if ((input.pendingEndorsements ?? 0) > 0) {
    items.push({
      key: "endorsements",
      tab: "endorsements",
      label: "Endorsements",
      why: `${input.pendingEndorsements} draft${input.pendingEndorsements === 1 ? "" : "s"} waiting.`,
      count: input.pendingEndorsements ?? 0,
    });
  }
  if ((input.openClaims ?? 0) > 0) {
    items.push({
      key: "claims",
      tab: "claims",
      label: "Claims",
      why: `${input.openClaims} open claim${input.openClaims === 1 ? "" : "s"}.`,
      count: input.openClaims ?? 0,
    });
  }
  if (!lapsed && lastTouch != null && lastTouch >= 21 && items.length === 0) {
    items.push({
      key: "silence",
      tab: "activity",
      label: "Silence",
      why: `No desk motion ${relativeTouchLabel(lastTouch)}.`,
      count: 1,
    });
  }
  return items;
}

export function policyTabCareCounts(items: PolicyCareItem[]): Partial<Record<AgentPolicyTab, number>> {
  const counts: Partial<Record<AgentPolicyTab, number>> = {};
  for (const item of items) {
    counts[item.tab] = (counts[item.tab] ?? 0) + item.count;
  }
  return counts;
}
