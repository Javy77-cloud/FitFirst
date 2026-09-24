import { RENEWAL_AGREED_LABEL } from "@/lib/policies/renewal-agreed";

/**
 * Dossier ink just to the right of Client staying.
 * Same paper, green done tone, and rotate(-8deg) as the deal stamp.
 */
export function RenewalAgreedStamp() {
  return (
    <div className="ff-renewal-agreed-stamp" data-ff-renewal-agreed-stamp="">
      <div className="ff-deal-status-stamp" data-ff-deal-status-stamp="done">
        <span className="ff-deal-status-stamp-ink">{RENEWAL_AGREED_LABEL}</span>
      </div>
    </div>
  );
}
