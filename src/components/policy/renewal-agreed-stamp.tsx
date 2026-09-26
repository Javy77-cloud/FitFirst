import { HandledStamp } from "@/components/renewals/handled-stamp";
import { RENEWAL_AGREED_LABEL } from "@/lib/policies/renewal-agreed";

/**
 * Dossier ink just to the right of Client staying.
 * Same rubber-stamp token as the Renewals board Handled mark.
 * Tilt stays the deal stamp's rotate(-8deg) from ff-stamp-ink-hit.
 */
export function RenewalAgreedStamp() {
  return <HandledStamp surface="dossier" label={RENEWAL_AGREED_LABEL} />;
}
