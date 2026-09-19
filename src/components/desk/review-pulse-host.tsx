import { RenewalMiniReview } from "@/components/renewals/renewal-mini-review";
import { resolveReviewPulse } from "@/app/actions/review-pulse";

export async function DeskReviewPulseHost() {
  const pulse = await resolveReviewPulse();
  if (!pulse) return null;
  return (
    <RenewalMiniReview
      policyId={pulse.policyId}
      contactId={pulse.contactId}
      accountId={pulse.accountId}
      skipCount={0}
      seed={`pulse:${pulse.policyId}:${pulse.trigger}`}
      trigger={pulse.trigger}
      clientName={pulse.clientName}
      openOnMount
    />
  );
}
