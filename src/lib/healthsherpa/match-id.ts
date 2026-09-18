import { isUuid } from "@/lib/ids";

/**
 * HealthSherpa `contact.external_id` is an arbitrary CRM string (docs sample: "CRM789012").
 * Only treat it as a FitFirst contact/deal id when it is a UUID — otherwise Postgres 22P02 500s.
 */
export function fitFirstMatchId(externalId: string | null | undefined): string | null {
  return externalId && isUuid(externalId) ? externalId : null;
}
