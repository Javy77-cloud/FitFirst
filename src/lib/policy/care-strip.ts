import { daysUntilDate, relativeTouchLabel } from "@/lib/book-lists/heat";
import type { AgentPolicyTab } from "@/lib/policy/tabs";
import { isOffBookStatus } from "@/lib/policy/status";
import { renewalProximityDrivesCare } from "@/lib/renewal/handled";
import { renewalDaysPhrase } from "@/lib/renewal/urgency";

export type PolicyCareItem = {
  key: string;
  tab: AgentPolicyTab;
  label: string;
  why: string;
  count: number;
};

/** e.g. "1 servicing file still missing: Dec on file" */
export function formatMissingDocsWhy(count: number, names?: readonly string[] | null): string {
  const n = Math.max(0, count);
  const labels = (names ?? []).map((name) => name.trim()).filter(Boolean);
  const noun = `servicing file${n === 1 ? "" : "s"} still missing`;
  if (labels.length === 0) return `${n} ${noun}.`;
  if (labels.length === 1) return `${n} ${noun}: ${labels[0]}`;
  if (labels.length === 2) return `${n} ${noun}: ${labels[0]} and ${labels[1]}`;
  const head = labels.slice(0, -1).join(", ");
  const last = labels[labels.length - 1];
  return `${n} ${noun}: ${head}, and ${last}`;
}

export function buildPolicyCareItems(input: {
  expirationDate?: Date | string | null;
  updatedAt?: Date | string | null;
  status?: string | null;
  missingDocs?: number;
  missingDocNames?: readonly string[] | null;
  pendingEndorsements?: number;
  openClaims?: number;
  asOf: Date;
  /** Client staying / Handled — skip renewal proximity care. */
  renewalHandled?: boolean;
}): PolicyCareItem[] {
  const items: PolicyCareItem[] = [];
  const daysUntil = daysUntilDate(input.expirationDate ?? null, input.asOf);
  const lastTouch = input.updatedAt
    ? Math.max(
        0,
        Math.floor((input.asOf.getTime() - new Date(input.updatedAt).getTime()) / 86_400_000),
      )
    : null;
  const offBook = isOffBookStatus(input.status);
  const countRenewal = !offBook && renewalProximityDrivesCare(input.renewalHandled);

  // Terminal / off-book statuses must NOT drive "Renewal docs due" from a printed expiration.
  if (countRenewal && daysUntil != null && daysUntil < 30) {
    items.push({
      key: "renewal",
      tab: "documents",
      label: "Renewal docs",
      why: `${renewalDaysPhrase(daysUntil)} — upload current + renewal paper here when not via API.`,
      count: 1,
    });
  }
  if ((input.missingDocs ?? 0) > 0) {
    items.push({
      key: "documents",
      tab: "documents",
      label: "Documents",
      why: formatMissingDocsWhy(input.missingDocs ?? 0, input.missingDocNames),
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
  if (!offBook && lastTouch != null && lastTouch >= 21 && items.length === 0) {
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
