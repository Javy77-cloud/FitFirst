import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, carriers, contacts, deals, leads, policies } from "@/lib/db/schema";
import { partyLabel } from "@/lib/desk/policy-name";
import { buildPolicyLabel } from "@/lib/policy/auto-label";
import { getAgencyPolicyLabelTemplate } from "@/lib/policy/auto-label-prefs";

export async function loadTaskLinkedNames(ids: {
  contactIds: string[];
  accountIds: string[];
  policyIds: string[];
  dealIds: string[];
  leadIds: string[];
}) {
  const uniq = (values: string[]) => [...new Set(values.filter(Boolean))];
  const contactIds = uniq(ids.contactIds);
  const accountIds = uniq(ids.accountIds);
  const policyIds = uniq(ids.policyIds);
  const dealIds = uniq(ids.dealIds);
  const leadIds = uniq(ids.leadIds);

  const [contactRows, accountRows, policyRows, dealRows, leadRows] = await Promise.all([
    contactIds.length
      ? db
          .select({
            id: contacts.id,
            firstName: contacts.firstName,
            lastName: contacts.lastName,
          })
          .from(contacts)
          .where(inArray(contacts.id, contactIds))
      : Promise.resolve([]),
    accountIds.length
      ? db
          .select({ id: accounts.id, name: accounts.name })
          .from(accounts)
          .where(inArray(accounts.id, accountIds))
      : Promise.resolve([]),
    policyIds.length
      ? db
          .select({
            id: policies.id,
            policyNumber: policies.policyNumber,
            labelOverride: policies.labelOverride,
            policyType: policies.policyType,
            lineOfBusiness: policies.lineOfBusiness,
            formType: policies.formType,
            policySubType: policies.policySubType,
            status: policies.status,
            effectiveDate: policies.effectiveDate,
            expirationDate: policies.expirationDate,
            contactId: policies.contactId,
            accountId: policies.accountId,
            carrierId: policies.carrierId,
          })
          .from(policies)
          .where(inArray(policies.id, policyIds))
      : Promise.resolve([]),
    dealIds.length
      ? db
          .select({ id: deals.id, title: deals.title })
          .from(deals)
          .where(inArray(deals.id, dealIds))
      : Promise.resolve([]),
    leadIds.length
      ? db
          .select({ id: leads.id, firstName: leads.firstName, lastName: leads.lastName })
          .from(leads)
          .where(inArray(leads.id, leadIds))
      : Promise.resolve([]),
  ]);

  // Extra FKs from linked policies (may not appear on the task row itself).
  const policyContactIds = uniq(
    policyRows.map((row) => row.contactId ?? "").filter(Boolean),
  );
  const policyAccountIds = uniq(
    policyRows.map((row) => row.accountId ?? "").filter(Boolean),
  );
  const carrierIds = uniq(policyRows.map((row) => row.carrierId ?? "").filter(Boolean));

  const missingContactIds = policyContactIds.filter((id) => !contactIds.includes(id));
  const missingAccountIds = policyAccountIds.filter((id) => !accountIds.includes(id));

  const [extraContacts, extraAccounts, carrierRows, labelTemplate] = await Promise.all([
    missingContactIds.length
      ? db
          .select({
            id: contacts.id,
            firstName: contacts.firstName,
            lastName: contacts.lastName,
          })
          .from(contacts)
          .where(inArray(contacts.id, missingContactIds))
      : Promise.resolve([]),
    missingAccountIds.length
      ? db
          .select({ id: accounts.id, name: accounts.name })
          .from(accounts)
          .where(inArray(accounts.id, missingAccountIds))
      : Promise.resolve([]),
    carrierIds.length
      ? db
          .select({ id: carriers.id, name: carriers.name })
          .from(carriers)
          .where(inArray(carriers.id, carrierIds))
      : Promise.resolve([]),
    getAgencyPolicyLabelTemplate(),
  ]);

  const contactById = new Map(
    [...contactRows, ...extraContacts].map((row) => [row.id, row] as const),
  );
  const accountById = new Map(
    [...accountRows, ...extraAccounts].map((row) => [row.id, row] as const),
  );
  const carrierById = new Map(carrierRows.map((row) => [row.id, row.name] as const));

  const policiesMap = new Map<string, { name: string; number: string }>();
  for (const row of policyRows) {
    const contact = row.contactId ? contactById.get(row.contactId) ?? null : null;
    const account = row.accountId ? accountById.get(row.accountId) ?? null : null;
    const ownerName = partyLabel(contact, account) || null;
    const carrier = row.carrierId ? carrierById.get(row.carrierId) ?? null : null;
    const autoLabel = buildPolicyLabel(labelTemplate, {
      ownerName,
      carrier,
      policyType: row.policyType,
      policyNumber: row.policyNumber,
      lineOfBusiness: row.lineOfBusiness,
      formType: row.formType,
      policySubType: row.policySubType,
      status: row.status,
      effectiveDate: row.effectiveDate,
      expirationDate: row.expirationDate,
    });
    const name = row.labelOverride?.trim() || autoLabel || row.policyNumber;
    policiesMap.set(row.id, { name, number: row.policyNumber });
  }

  return {
    contacts: new Map(
      contactRows.map((row) => [row.id, `${row.lastName}, ${row.firstName}`] as const),
    ),
    accounts: new Map(accountRows.map((row) => [row.id, row.name] as const)),
    policies: policiesMap,
    deals: new Map(dealRows.map((row) => [row.id, row.title] as const)),
    leads: new Map(
      leadRows.map(
        (row) =>
          [row.id, `${row.lastName}, ${row.firstName}`.replace(/^, /, "")] as const,
      ),
    ),
  };
}
