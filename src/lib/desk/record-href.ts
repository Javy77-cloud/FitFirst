/** In-desk path for a tagged record. Commission rows stay on the commissions list. */
export function recordHref(entityType?: string | null, entityId?: string | null): string | null {
  if (!entityType || !entityId) return null;
  if (entityType === "contact") return `/contacts/${entityId}`;
  if (entityType === "account") return `/accounts/${entityId}`;
  if (entityType === "lead") return `/leads/${entityId}`;
  if (entityType === "deal") return `/deals/${entityId}`;
  if (entityType === "policy") return `/policies/${entityId}`;
  if (entityType === "carrier") return `/carriers/${entityId}`;
  return null;
}
