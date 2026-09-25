import { and, eq, isNotNull } from "drizzle-orm";
import {
  isActiveProducer,
  isListedProducerSpelling,
  sameProducerIdentity,
  type ProducerRef,
} from "@/lib/auth/producer-identity";
import { db } from "@/lib/db";
import { policies, policyChangeLogs, users } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";

/**
 * Channel / MGA codes that land in `policies.producer` from dec extract.
 * These are not persons — Overview / Activity must not show them as Producer.
 */
const AGENCY_CHANNEL_PRODUCER_CODES = new Set([
  "afa",
  "backnine",
  "back nine",
  "back-nine",
  "fitfirst",
  "fit first",
]);

/** True when the stored producer string is an agency/channel code, not a person. */
export function isAgencyChannelProducer(raw: string | null | undefined): boolean {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return true;
  const norm = trimmed.toLowerCase().replace(/\s+/g, " ");
  if (AGENCY_CHANNEL_PRODUCER_CODES.has(norm)) return true;
  // Short all-caps acronyms (AFA, HOI) with no person-name shape.
  if (/^[A-Z]{2,5}$/.test(trimmed)) return true;
  return false;
}

export type ProducerLogin = {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
  active?: boolean | null;
  accessStatus?: string | null;
  removedAt?: Date | string | null;
  frozenAt?: Date | string | null;
  updatedAt?: Date | string | null;
  /** Spellings this login used before a Settings rename. Not rewritten. */
  priorNames?: readonly string[];
};

/**
 * Desk Producer label (policy Overview, deal header, lead header).
 *
 * `policies.producer` is a frozen string written at import or mint (often a
 * channel code such as AFA, sometimes an old personal spelling). Activity
 * logs keep their own `producer_name` stamp. This label does not rewrite
 * either of those.
 *
 * The assigned owner is `users.name` on `owner_id`. When that row is the same
 * person as another login — matched by the producer-identity spellings or by
 * a prior name still on the change log — the desk shows the Settings name on
 * that other active login. A Settings rename therefore shows up on every
 * client without a re-fill. Re-fill only writes `policies.producer` when that
 * column is blank, so it leaves this label alone.
 */
export function liveDeskProducerName(input: {
  owner: ProducerLogin | null;
  logins: readonly ProducerLogin[];
  storedProducer?: string | null;
  sellingAgency?: string | null;
}): string | null {
  const stored = input.storedProducer?.trim() || "";
  const agency = input.sellingAgency?.trim() || "";
  const owner = input.owner;

  if (owner?.id) {
    const picked = pickSettingsName(owner, settingsLoginsFor(owner, input.logins));
    if (picked) return picked;
  }

  if (!stored || isAgencyChannelProducer(stored)) return null;
  if (agency && stored.toLowerCase() === agency.toLowerCase()) return null;

  const storedOwner: ProducerLogin = { id: "", name: stored };
  const fromStored = pickSettingsName(storedOwner, settingsLoginsFor(storedOwner, input.logins));
  return fromStored || stored;
}

function settingsLoginsFor(owner: ProducerLogin, logins: readonly ProducerLogin[]): ProducerLogin[] {
  return logins.filter(
    (login) =>
      login.id !== owner.id &&
      isActiveProducer(login) &&
      login.name.trim() &&
      sameProducerPerson(login, owner),
  );
}

function pickSettingsName(owner: ProducerLogin, others: readonly ProducerLogin[]): string | null {
  const group = [owner, ...others].filter((login) => login.name.trim());
  // Settings rename that left the historical nickname list (Javy Rivera /
  // Francisco Javier Garcia → Javier Garcia). A later save on the book-owner
  // row does not put the old spelling back.
  const renamed = group.filter((login) => !isListedProducerSpelling(login.name));
  if (renamed.length === 1) return renamed[0]?.name.trim() || null;
  if (renamed.length > 1) {
    const ranked = [...renamed].sort((left, right) => stamp(right.updatedAt) - stamp(left.updatedAt));
    return ranked[0]?.name.trim() || null;
  }
  return owner.name.trim() || null;
}

function stamp(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

/** Same person across duplicate logins, including a Settings name that left the nickname list. */
function sameProducerPerson(left: ProducerLogin, right: ProducerLogin): boolean {
  if (left.id && right.id && left.id === right.id) return true;
  const leftNames = spellings(left);
  const rightNames = spellings(right);
  for (const leftName of leftNames) {
    for (const rightName of rightNames) {
      const a: ProducerRef = { id: "", name: leftName, email: left.email, role: left.role };
      const b: ProducerRef = { id: "", name: rightName, email: right.email, role: right.role };
      if (sameProducerIdentity(a, b)) return true;
    }
  }
  return false;
}

function spellings(login: ProducerLogin): string[] {
  const names = [login.name, ...(login.priorNames ?? [])];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed || isAgencyChannelProducer(trimmed)) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

async function loadProducerLogins(): Promise<ProducerLogin[]> {
  const [people, history] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        active: users.active,
        accessStatus: users.accessStatus,
        removedAt: users.removedAt,
        frozenAt: users.frozenAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.tenantId, DEFAULT_TENANT_ID)),
    db
      .select({
        userId: policyChangeLogs.changedBy,
        name: policyChangeLogs.changedByName,
      })
      .from(policyChangeLogs)
      .where(and(eq(policyChangeLogs.tenantId, DEFAULT_TENANT_ID), isNotNull(policyChangeLogs.changedBy)))
      .groupBy(policyChangeLogs.changedBy, policyChangeLogs.changedByName),
  ]);
  const prior = new Map<string, string[]>();
  for (const row of history) {
    const userId = row.userId;
    const name = row.name?.trim();
    if (!userId || !name) continue;
    const list = prior.get(userId) ?? [];
    list.push(name);
    prior.set(userId, list);
  }
  return people.map((person) => ({
    ...person,
    priorNames: prior.get(person.id) ?? [],
  }));
}

/**
 * Live Producer label for a deal, lead, or other record owned by `ownerId`.
 * Null when the record is unassigned.
 */
export async function resolveAssignedProducerName(
  ownerId: string | null | undefined,
): Promise<string | null> {
  if (!ownerId) return null;
  const logins = await loadProducerLogins();
  const owner = logins.find((login) => login.id === ownerId) ?? null;
  if (!owner) return null;
  return liveDeskProducerName({ owner, logins });
}

/**
 * Producer person for the policy Overview.
 * New activity stamps use this same live name at write time. Existing
 * `activity_logs.producer_name` rows are left as written.
 */
export async function resolvePolicyProducerName(
  policyId: string | null | undefined,
): Promise<string | null> {
  if (!policyId) return null;
  const [row, logins] = await Promise.all([
    db
      .select({
        producer: policies.producer,
        sellingAgency: policies.sellingAgency,
        ownerId: policies.ownerId,
      })
      .from(policies)
      .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    loadProducerLogins(),
  ]);
  if (!row) return null;
  const owner = row.ownerId ? (logins.find((login) => login.id === row.ownerId) ?? null) : null;
  return liveDeskProducerName({
    owner,
    logins,
    storedProducer: row.producer,
    sellingAgency: row.sellingAgency,
  });
}
