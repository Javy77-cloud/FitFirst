import { and, desc, eq, inArray, or } from "drizzle-orm";
import { notHiddenDocument } from "@/lib/documents/visible-docs";
import { AGENCY_BRAND, DEFAULT_TENANT_ID, isCertifiableLine } from "@/lib/domain";
import { CONTACT_ID } from "@/lib/fixtures/ids";
import { isUuid } from "@/lib/ids";
import { isInForceStatus } from "@/lib/policy/status";
import { db } from "@/lib/db";
import {
  accounts,
  agencyBrand,
  contacts,
  documents,
  carriers,
  issuedCertificates,
  policies,
  portalTokens,
  type Account,
  type Contact,
  type Document,
  type IssuedCertificate,
  type Policy,
  type PortalToken,
} from "@/lib/db/schema";
import { normalizeHolderName, type PortalKind } from "./types";

export type PortalBrand = {
  agencyName: string;
  phone: string;
};

export type PortalPolicy = {
  policy: Policy;
  carrierName: string;
  idCards: Document[];
};

export type PortalSession = {
  token: PortalToken;
  kind: PortalKind;
  brand: PortalBrand;
  contact: Contact | null;
  account: Account | null;
  partyName: string;
  policies: PortalPolicy[];
  certificates: IssuedCertificate[];
  canRequestCoi: boolean;
};

export type PortalResolveResult =
  | { ok: true; session: PortalSession }
  | { ok: false; error: string };

function tenantId() {
  return DEFAULT_TENANT_ID;
}

export function isAnaContact(contactId: string | null | undefined): boolean {
  return contactId === CONTACT_ID;
}

export async function loadPortalBrand(): Promise<PortalBrand> {
  const [row] = await db
    .select()
    .from(agencyBrand)
    .where(eq(agencyBrand.tenantId, tenantId()));
  return {
    agencyName: row?.agencyName?.trim() || AGENCY_BRAND.name,
    phone: AGENCY_BRAND.phone,
  };
}

export async function resolvePortalToken(rawToken: string): Promise<PortalResolveResult> {
  const token = rawToken.trim();
  if (!token) return { ok: false, error: "Enter the link code from your agency." };

  const [row] = await db
    .select()
    .from(portalTokens)
    .where(and(eq(portalTokens.tenantId, tenantId()), eq(portalTokens.token, token)));
  if (!row) return { ok: false, error: "That portal link is missing or expired." };
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "That portal link is missing or expired." };
  }
  if (isAnaContact(row.contactId)) {
    return { ok: false, error: "That portal link is missing or expired." };
  }

  const [contact, account, brand] = await Promise.all([
    row.contactId
      ? db
          .select()
          .from(contacts)
          .where(and(eq(contacts.tenantId, tenantId()), eq(contacts.id, row.contactId)))
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    row.accountId
      ? db
          .select()
          .from(accounts)
          .where(and(eq(accounts.tenantId, tenantId()), eq(accounts.id, row.accountId)))
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    loadPortalBrand(),
  ]);

  const policyFilter = [
    row.contactId ? eq(policies.contactId, row.contactId) : undefined,
    row.accountId ? eq(policies.accountId, row.accountId) : undefined,
  ].filter(Boolean);

  const policyRows =
    policyFilter.length === 0
      ? []
      : await db
          .select({ policy: policies, carrier: carriers })
          .from(policies)
          .leftJoin(carriers, eq(policies.carrierId, carriers.id))
          .where(and(eq(policies.tenantId, tenantId()), or(...policyFilter)))
          .orderBy(desc(policies.effectiveDate));

  const policyIds = policyRows.map((row) => row.policy.id);
  const idCardRows =
    policyIds.length === 0
      ? []
      : await db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.tenantId, tenantId()),
              inArray(documents.policyId, policyIds),
              eq(documents.slot, "policy_file"),
              notHiddenDocument(),
            ),
          );

  const certificates = row.accountId
    ? await db
        .select()
        .from(issuedCertificates)
        .where(
          and(
            eq(issuedCertificates.tenantId, tenantId()),
            eq(issuedCertificates.accountId, row.accountId),
          ),
        )
        .orderBy(desc(issuedCertificates.issuedAt))
    : [];

  const policiesWithCards: PortalPolicy[] = policyRows.map((row) => ({
    policy: row.policy,
    carrierName: row.carrier?.name ?? "Carrier on file",
    idCards: idCardRows.filter(
      (doc) =>
        doc.policyId === row.policy.id &&
        (doc.docType === "policy_id" || /id[-_ ]?card/i.test(doc.filename)),
    ),
  }));

  const canRequestCoi = policyRows.some(
    (row) =>
      isInForceStatus(row.policy.status) && isCertifiableLine(row.policy.lineOfBusiness),
  );

  const partyName = account?.name
    ? account.name
    : contact
      ? `${contact.firstName} ${contact.lastName}`
      : row.label;

  await db
    .update(portalTokens)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(portalTokens.id, row.id));

  return {
    ok: true,
    session: {
      token: row,
      kind: row.kind === "commercial" ? "commercial" : "personal",
      brand,
      contact,
      account,
      partyName,
      policies: policiesWithCards,
      certificates,
      canRequestCoi,
    },
  };
}

export function findMatchingCertificate(
  certificates: IssuedCertificate[],
  holderName: string,
): IssuedCertificate | null {
  const needle = normalizeHolderName(holderName);
  if (!needle) return null;
  return (
    certificates.find((cert) => normalizeHolderName(cert.holderName) === needle) ?? null
  );
}

export async function findPortalTokenFor(input: {
  contactId?: string | null;
  accountId?: string | null;
  policyContactId?: string | null;
  policyAccountId?: string | null;
}): Promise<PortalToken | null> {
  const ids = [input.contactId, input.accountId, input.policyContactId, input.policyAccountId].filter(
    (id): id is string => Boolean(id) && isUuid(id) && !isAnaContact(id),
  );
  if (ids.length === 0) return null;

  const [byContact, byAccount] = await Promise.all([
    input.contactId && !isAnaContact(input.contactId)
      ? db
          .select()
          .from(portalTokens)
          .where(
            and(eq(portalTokens.tenantId, tenantId()), eq(portalTokens.contactId, input.contactId)),
          )
      : Promise.resolve([]),
    input.accountId
      ? db
          .select()
          .from(portalTokens)
          .where(
            and(eq(portalTokens.tenantId, tenantId()), eq(portalTokens.accountId, input.accountId)),
          )
      : Promise.resolve([]),
  ]);
  return byContact[0] ?? byAccount[0] ?? null;
}

export function portalHref(token: string, path = ""): string {
  const suffix = path ? `/${path.replace(/^\/+/, "")}` : "";
  return `/portal/${encodeURIComponent(token)}${suffix}`;
}
