import { commitmentNudgeUrgency } from "@/lib/notifications/panel";

export type CommitmentRecordType = "contact" | "deal" | "policy" | "lead" | "account";

export type CommitmentHeat = "overdue" | "due_soon" | "later";

export type Commitment = {
  id: string;
  source: "review" | "activity";
  title: string;
  dueAt: Date;
  status: string;
  kind: string;
  heat: CommitmentHeat;
  contactId: string | null;
  dealId: string | null;
  policyId: string | null;
  leadId: string | null;
  accountId: string | null;
  recordType: CommitmentRecordType | null;
  recordName: string | null;
  href: string;
  orphan: boolean;
};

export const DUE_SOON_HOURS = 48;

export function commitmentHeat(dueAt: Date, asOf: Date): CommitmentHeat {
  const ms = dueAt.getTime() - asOf.getTime();
  if (ms < 0) return "overdue";
  if (ms <= DUE_SOON_HOURS * 60 * 60 * 1000) return "due_soon";
  return "later";
}

export function isHotCommitment(heat: CommitmentHeat): boolean {
  return heat === "overdue" || heat === "due_soon";
}

export function commitmentHasEntity(row: {
  contactId?: string | null;
  dealId?: string | null;
  policyId?: string | null;
  leadId?: string | null;
  accountId?: string | null;
}): boolean {
  return Boolean(row.contactId || row.dealId || row.policyId || row.leadId || row.accountId);
}

export function commitmentEntityHref(row: {
  contactId?: string | null;
  dealId?: string | null;
  policyId?: string | null;
  leadId?: string | null;
  accountId?: string | null;
}): string {
  if (row.dealId) return `/deals/${row.dealId}`;
  if (row.policyId) return `/policies/${row.policyId}`;
  if (row.contactId) return `/contacts/${row.contactId}`;
  if (row.accountId) return `/accounts/${row.accountId}`;
  if (row.leadId) return `/leads/${row.leadId}`;
  return "/notifications#commitments";
}

export function commitmentRecordType(row: {
  contactId?: string | null;
  dealId?: string | null;
  policyId?: string | null;
  leadId?: string | null;
  accountId?: string | null;
}): CommitmentRecordType | null {
  if (row.dealId) return "deal";
  if (row.policyId) return "policy";
  if (row.contactId) return "contact";
  if (row.accountId) return "account";
  if (row.leadId) return "lead";
  return null;
}

export function shouldNudgeCommitment(dueAt: Date, asOf: Date): boolean {
  return commitmentNudgeUrgency(dueAt, asOf) != null;
}

/** Prefer unique name hits so we never attach an orphan to two records. */
export function matchOrphanToName(
  title: string,
  names: { id: string; name: string; type: CommitmentRecordType }[],
): { id: string; type: CommitmentRecordType } | null {
  const hay = title.trim().toLowerCase();
  if (!hay) return null;
  const hits = names.filter((row) => {
    const name = row.name.trim().toLowerCase();
    return name.length >= 3 && hay.includes(name);
  });
  if (hits.length !== 1) return null;
  return { id: hits[0].id, type: hits[0].type };
}

export function applyOrphanLink<T extends {
  contactId?: string | null;
  dealId?: string | null;
  policyId?: string | null;
  leadId?: string | null;
  accountId?: string | null;
}>(row: T, link: { id: string; type: CommitmentRecordType }): T {
  if (link.type === "contact") return { ...row, contactId: link.id };
  if (link.type === "deal") return { ...row, dealId: link.id };
  if (link.type === "policy") return { ...row, policyId: link.id };
  if (link.type === "lead") return { ...row, leadId: link.id };
  return { ...row, accountId: link.id };
}

export function commitmentsForEntity(
  rows: readonly Commitment[],
  entity: { contactId?: string | null; dealId?: string | null },
): Commitment[] {
  return rows.filter((row) => {
    if (entity.dealId && row.dealId === entity.dealId) return true;
    if (entity.contactId && row.contactId === entity.contactId) return true;
    return false;
  });
}

export const COMMITMENTS_TIMELINE_HREF = "/notifications#commitments";
export const NEW_COMMITMENT_HREF = "/notifications?newCommitment=1#commitments";

export type SerializedCommitment = Omit<Commitment, "dueAt"> & { dueAt: string };

export function serializeCommitment(row: Commitment): SerializedCommitment {
  return { ...row, dueAt: row.dueAt.toISOString() };
}

export function serializeCommitments(rows: readonly Commitment[]): SerializedCommitment[] {
  return rows.map(serializeCommitment);
}
