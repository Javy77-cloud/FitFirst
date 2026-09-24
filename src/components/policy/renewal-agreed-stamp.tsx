import { RENEWAL_AGREED_LABEL } from "@/lib/policies/renewal-agreed";

/** Dossier ink stamp. Same classes as the deal status stamp, green done ink. */
export function RenewalAgreedStamp() {
  return (
    <div
      className="ff-deal-status-stamp"
      data-ff-deal-status-stamp="done"
      data-ff-renewal-agreed-stamp=""
    >
      <span className="ff-deal-status-stamp-ink">{RENEWAL_AGREED_LABEL}</span>
    </div>
  );
}
