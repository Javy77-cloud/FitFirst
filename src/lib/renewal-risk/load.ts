import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { accounts, activityLogs, contacts, policies, policyTerms } from "@/lib/db/schema";
import { DESK_AS_OF } from "@/lib/home/as-of";
import { parseMoney } from "@/lib/renewal/compare";
import { isInForceStatus } from "@/lib/policy/status";
import {
  daysUntil,
  householdHasLapse,
  householdInForceCount,
  nearestRenewalDays,
  scoreRenewalRisk,
  type RenewalRiskScore,
} from "./score";

export type RenewalRiskAccount = {
  key: string;
  kind: "contact" | "account";
  id: string;
  name: string;
  href: string;
  ownerId: string | null;
  daysToRenewal: number | null;
  premiumChangePct: number | null;
  inForceCount: number;
  policyNumber: string | null;
  lineOfBusiness: string | null;
  risk: RenewalRiskScore;
};

type PolicyRow = typeof policies.$inferSelect;

function personName(row: { firstName: string; lastName: string }): string {
  return `${row.lastName}, ${row.firstName}`;
}

function lastContactDays(
  logs: { occurredAt: Date }[],
  asOf: Date,
): number | null {
  if (logs.length === 0) return null;
  const latest = logs.reduce((max, row) => (row.occurredAt > max ? row.occurredAt : max), logs[0].occurredAt);
  return daysUntil(latest, asOf);
}

function premiumChangeFor(
  householdPolicies: PolicyRow[],
  terms: { policyId: string; role: string; premium: string | null }[],
): number | null {
  const inForce = householdPolicies.filter((policy) => isInForceStatus(policy.status));
  for (const policy of inForce) {
    const current = terms.find((term) => term.policyId === policy.id && term.role === "current");
    const proposed = terms.find((term) => term.policyId === policy.id && term.role === "proposed");
    const cur = parseMoney(current?.premium ?? policy.premium);
    const next = parseMoney(proposed?.premium);
    if (cur != null && next != null && cur !== 0) return (next - cur) / cur;
  }
  return null;
}

function nearestPolicy(household: PolicyRow[], asOf: Date): PolicyRow | null {
  const inForce = household.filter((policy) => isInForceStatus(policy.status));
  if (inForce.length === 0) return null;
  return inForce
    .slice()
    .sort((a, b) => {
      const aDate = a.renewalDate ?? a.expirationDate;
      const bDate = b.renewalDate ?? b.expirationDate;
      return daysUntil(asOf, aDate) - daysUntil(asOf, bDate);
    })[0];
}

export function scoreHousehold(input: {
  policies: PolicyRow[];
  terms: { policyId: string; role: string; premium: string | null }[];
  lastContactDays: number | null;
  asOf?: Date;
}): RenewalRiskScore {
  const asOf = input.asOf ?? DESK_AS_OF;
  return scoreRenewalRisk({
    daysToRenewal: nearestRenewalDays(input.policies, asOf),
    premiumChangePct: premiumChangeFor(input.policies, input.terms),
    inForceCount: householdInForceCount(input.policies),
    hasLapseHistory: householdHasLapse(input.policies),
    daysSinceContact: input.lastContactDays,
  });
}

export async function loadRenewalRiskAccounts(opts?: {
  asOf?: Date;
  ownerId?: string | null;
  flaggedOnly?: boolean;
}): Promise<RenewalRiskAccount[]> {
  const asOf = opts?.asOf ?? DESK_AS_OF;
  const [policyRows, contactRows, accountRows, termRows, logRows] = await Promise.all([
    db.select().from(policies).where(eq(policies.tenantId, DEFAULT_TENANT_ID)),
    db.select().from(contacts).where(eq(contacts.tenantId, DEFAULT_TENANT_ID)),
    db.select().from(accounts).where(eq(accounts.tenantId, DEFAULT_TENANT_ID)),
    db
      .select({
        policyId: policyTerms.policyId,
        role: policyTerms.role,
        premium: policyTerms.premium,
      })
      .from(policyTerms)
      .where(eq(policyTerms.tenantId, DEFAULT_TENANT_ID)),
    db
      .select({
        contactId: activityLogs.contactId,
        accountId: activityLogs.accountId,
        occurredAt: activityLogs.occurredAt,
      })
      .from(activityLogs)
      .where(eq(activityLogs.tenantId, DEFAULT_TENANT_ID)),
  ]);

  const terms = termRows;
  const contactLogs = new Map<string, { occurredAt: Date }[]>();
  const accountLogs = new Map<string, { occurredAt: Date }[]>();
  for (const row of logRows) {
    if (row.contactId) {
      const list = contactLogs.get(row.contactId) ?? [];
      list.push(row);
      contactLogs.set(row.contactId, list);
    }
    if (row.accountId) {
      const list = accountLogs.get(row.accountId) ?? [];
      list.push(row);
      accountLogs.set(row.accountId, list);
    }
  }

  const rows: RenewalRiskAccount[] = [];

  for (const contact of contactRows) {
    const household = policyRows.filter((policy) => policy.contactId === contact.id);
    if (household.length === 0) continue;
    const risk = scoreHousehold({
      policies: household,
      terms,
      lastContactDays: lastContactDays(contactLogs.get(contact.id) ?? [], asOf),
      asOf,
    });
    if (opts?.flaggedOnly && !risk.flagged) continue;
    if (opts?.ownerId && contact.ownerId && contact.ownerId !== opts.ownerId) continue;
    const nearest = nearestPolicy(household, asOf);
    rows.push({
      key: `c:${contact.id}`,
      kind: "contact",
      id: contact.id,
      name: personName(contact),
      href: `/contacts/${contact.id}`,
      ownerId: contact.ownerId,
      daysToRenewal: nearestRenewalDays(household, asOf),
      premiumChangePct: premiumChangeFor(household, terms),
      inForceCount: householdInForceCount(household),
      policyNumber: nearest?.policyNumber ?? null,
      lineOfBusiness: nearest?.lineOfBusiness ?? null,
      risk,
    });
  }

  for (const account of accountRows) {
    const household = policyRows.filter((policy) => policy.accountId === account.id);
    if (household.length === 0) continue;
    const risk = scoreHousehold({
      policies: household,
      terms,
      lastContactDays: lastContactDays(accountLogs.get(account.id) ?? [], asOf),
      asOf,
    });
    if (opts?.flaggedOnly && !risk.flagged) continue;
    const nearest = nearestPolicy(household, asOf);
    if (opts?.ownerId && nearest?.ownerId && nearest.ownerId !== opts.ownerId) continue;
    rows.push({
      key: `a:${account.id}`,
      kind: "account",
      id: account.id,
      name: account.name,
      href: `/accounts/${account.id}`,
      ownerId: nearest?.ownerId ?? null,
      daysToRenewal: nearestRenewalDays(household, asOf),
      premiumChangePct: premiumChangeFor(household, terms),
      inForceCount: householdInForceCount(household),
      policyNumber: nearest?.policyNumber ?? null,
      lineOfBusiness: nearest?.lineOfBusiness ?? null,
      risk,
    });
  }

  return rows.sort((a, b) => b.risk.score - a.risk.score || (a.daysToRenewal ?? 999) - (b.daysToRenewal ?? 999));
}

export async function loadRenewalRiskForIds(input: {
  contactId?: string | null;
  accountId?: string | null;
  asOf?: Date;
}): Promise<RenewalRiskAccount | null> {
  const ids = [input.contactId, input.accountId].filter(Boolean) as string[];
  if (ids.length === 0) return null;
  const rows = await loadRenewalRiskAccounts({ asOf: input.asOf });
  return (
    rows.find((row) => row.kind === "contact" && row.id === input.contactId) ??
    rows.find((row) => row.kind === "account" && row.id === input.accountId) ??
    null
  );
}

export async function loadRenewalRiskForContact(contactId: string, asOf?: Date) {
  return loadRenewalRiskForIds({ contactId, asOf });
}

export async function loadRenewalRiskForAccount(accountId: string, asOf?: Date) {
  return loadRenewalRiskForIds({ accountId, asOf });
}
