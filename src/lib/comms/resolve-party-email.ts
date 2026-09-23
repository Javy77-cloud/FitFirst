/** Prefer contact → lead → account. Deals have no email column. */
export function resolvePartyEmail(input: {
  contact?: { email?: string | null } | null;
  lead?: { email?: string | null } | null;
  account?: { email?: string | null } | null;
}): string | null {
  const raw =
    input.contact?.email?.trim() ||
    input.lead?.email?.trim() ||
    input.account?.email?.trim() ||
    "";
  return raw || null;
}
