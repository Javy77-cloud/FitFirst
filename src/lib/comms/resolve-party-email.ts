import { dealRecordEmail } from "@/lib/deals/deal-columns";

/** Prefer contact → lead → account → Deal Details CF (email / applicant_email / co_applicant_email). */
export function resolvePartyEmail(input: {
  contact?: { email?: string | null } | null;
  lead?: { email?: string | null } | null;
  account?: { email?: string | null } | null;
  /** desk_custom_field_values for module deal (any deal). */
  dealStored?: Record<string, string> | null;
}): string | null {
  const raw =
    input.contact?.email?.trim() ||
    input.lead?.email?.trim() ||
    input.account?.email?.trim() ||
    (input.dealStored ? dealRecordEmail(input.dealStored) : "") ||
    "";
  return raw || null;
}
