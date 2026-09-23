import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { policies, users } from "@/lib/db/schema";
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

/**
 * Producer *person* name for Overview, Activity & Timeline.
 * Prefer policy owner (desk user profile Name). `policies.producer` is often an
 * agency/channel code (AFA, BackNine) — use only when it looks like a person.
 */
export async function resolvePolicyProducerName(
  policyId: string | null | undefined,
): Promise<string | null> {
  if (!policyId) return null;
  const [row] = await db
    .select({
      producer: policies.producer,
      sellingAgency: policies.sellingAgency,
      ownerName: users.name,
    })
    .from(policies)
    .leftJoin(users, eq(policies.ownerId, users.id))
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)))
    .limit(1);
  const owner = row?.ownerName?.trim();
  if (owner) return owner;

  const stored = row?.producer?.trim() || "";
  if (!stored || isAgencyChannelProducer(stored)) return null;
  const agency = row?.sellingAgency?.trim() || "";
  if (agency && stored.toLowerCase() === agency.toLowerCase()) return null;
  return stored;
}
