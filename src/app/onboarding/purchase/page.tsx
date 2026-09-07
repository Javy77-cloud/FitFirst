import { LearningConsentCheckbox } from "@/components/onboarding/learning-consent-checkbox";
import { recordLearningPoolConsent } from "@/app/actions/learning-consent";
import { Button } from "@/components/ui/button";
import { isLearningPoolConsentLive } from "@/lib/learning-pipeline/flags";

export const dynamic = "force-dynamic";

/** Dormant purchase stub. Not linked from the desk sidebar. */
export default function OnboardingPurchasePage() {
  const consentLive = isLearningPoolConsentLive();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-xl space-y-5">
        <div>
          <div className="text-caption uppercase tracking-wide text-muted-foreground">
            FitFirst purchase
          </div>
          <h1 className="text-2xl font-semibold text-navy">Agency onboarding</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Purchase checkout is not live. Consent storage and the learning-pool gate are in
            place so enabling is a flag flip later.
          </p>
        </div>

        <form action={recordLearningPoolConsent} className="space-y-4">
          <LearningConsentCheckbox consentLive={consentLive} />
          <Button type="submit" disabled={!consentLive}>
            {consentLive ? "Save consent choice" : "Save consent (disabled until purchase)"}
          </Button>
        </form>
      </div>
    </div>
  );
}
